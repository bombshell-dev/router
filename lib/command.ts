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

export function command<
  const N extends string,
  const E extends readonly Input[],
>(
  start: Definition<N>,
  ...elements: E & Validate<CommandZero<N>, E>
): Materialize<Fold<CommandZero<N>, Normalize<E>>> {
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
  ) as Materialize<Fold<CommandZero<N>, Normalize<E>>>;
}
