// deno-lint-ignore-file ban-types
import type { Fold, Materialize } from "./pipeline.ts";
import {
  type Input,
  type Normalize,
  normalize,
  type Validate,
} from "./route.ts";
import type {
  AnyPhases,
  AnyRoute,
  Definition,
  Done as DoneInternal,
  Method,
  Next as NextInternal,
  Route,
} from "./types.ts";

type CommandZero<N extends string = string> = Route<
  N,
  "help" | "execute",
  [DoneInternal<{}, []>]
>;

/** A complete command route */
export interface Command<
  N extends string,
  M extends Method,
  P extends AnyPhases,
> extends Route<N, M, P> {}

// deno-lint-ignore no-namespace
export namespace Command {
  /** A pipeline element accepted by {@link command}. */
  export type Element = Input;

  /** A completed phase */
  export type Done<
    Model extends object,
    Routes extends readonly AnyRoute[],
  > = DoneInternal<Model, Routes>;

  /** A suspended phase */
  export type Next<
    Model extends object,
    Routes extends readonly AnyRoute[],
    Requirement,
  > = NextInternal<Model, Routes, Requirement>;

  /** The completed command type produced by {@link command}. */
  export type Result<
    N extends string,
    E extends readonly Element[],
  > = FromRoute<Materialize<Fold<CommandZero<N>, Normalize<E>>>>;
}

type CommandPhase<P> = P extends
  NextInternal<infer Model, infer Routes, infer Requirement>
  ? Command.Next<Model, Routes, Requirement>
  : P extends DoneInternal<infer Model, infer Routes>
    ? Command.Done<Model, Routes>
  : P;

type CommandPhases<P extends AnyPhases> = {
  [K in keyof P]: CommandPhase<P[K]>;
};

type FromRoute<R> = AnyRoute extends R ? R
  : R extends Route<infer N, infer M, infer P> ? Command<N, M, CommandPhases<P>>
  : R;

export function command<
  const N extends string,
  const E extends readonly Command.Element[],
>(
  start: Definition<N>,
  ...elements: E & Validate<CommandZero<N>, E>
): Command.Result<N, E> {
  let zero: CommandZero<N> = {
    ...start,
    methods: ["help", "execute"],
    phases: [{
      model: {
        params: {},
        steps: [],
      },
      routes: [],
      values: [],
      envs: [],
    }],
  };

  return normalize<E>(elements).reduce<unknown>(
    (value, element) => element(value as never),
    zero,
  ) as Command.Result<N, E>;
}
