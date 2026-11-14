// deno-lint-ignore-file ban-types
import type { Fold, Materialize } from "./pipeline.ts";
import {
  type Input,
  type Normalize,
  normalize,
  type Validate,
} from "./route.ts";
import type { Definition, Done, Route } from "./types.ts";

export type CommandZero<N extends string = string> = Route<
  N,
  "help" | "execute",
  [Done<{}, []>]
>;

/** A pipeline element accepted by {@link command}. */
export type CommandElement = Input;

/** The completed command type produced by {@link command}. */
export type CommandResult<
  N extends string,
  E extends readonly CommandElement[],
> = Materialize<Fold<CommandZero<N>, Normalize<E>>>;

export function command<
  const N extends string,
  const E extends readonly CommandElement[],
>(
  start: Definition<N>,
  ...elements: E & Validate<CommandZero<N>, E>
): CommandResult<N, E> {
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
  ) as CommandResult<N, E>;
}
