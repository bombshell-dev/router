// deno-lint-ignore-file ban-types
import {
  brand,
  type Fold,
  type Materialize,
  type MethodElement,
  type RoutesElement,
  type Unary,
} from "./pipeline.ts";
import type { AnyRoute, Definition, Done, Route } from "./types.ts";

export type RouteZero<N extends string = string> = Route<
  N,
  "help",
  [Done<{}, []>]
>;

export function route<
  const N extends string,
  const E extends readonly Input[],
>(
  start: Definition<N>,
  ...elements: E & Validate<RouteZero<N>, E>
): Materialize<Fold<RouteZero<N>, Normalize<E>>> {
  let zero: RouteZero<N> = {
    ...start,
    methods: ["help"],
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
  ) as Materialize<Fold<RouteZero<N>, Normalize<E>>>;
}

export function version(semver: string): MethodElement<"version"> {
  return brand<MethodElement<"version">>((route: AnyRoute) => ({
    ...route,
    methods: [...route.methods, "version"] as const,
    version: semver,
  }));
}

export function executable(): MethodElement<"execute"> {
  return brand<MethodElement<"execute">>((route: AnyRoute) => ({
    ...route,
    methods: [...route.methods, "execute"] as const,
  }));
}

export type Input = Unary | AnyRoute;

export type Normalize<E extends readonly Input[]> = {
  [K in keyof E]: Normalized<E[K]>;
};

// Walk invalid pipelines only, reporting errors on the original arguments.
export type Validate<S, E extends readonly Input[]> =
  [Fold<S, Normalize<E>>] extends [never] ? Invalid<S, E> : unknown;

export function normalize<const E extends readonly Input[]>(
  elements: E,
): Normalize<E> {
  return elements.map((element) =>
    typeof element === "function" ? element : routes(element)
  ) as Normalize<E>;
}

function routes<const C extends readonly AnyRoute[]>(
  ...children: C
): RoutesElement<C> {
  return brand<RoutesElement<C>>((route: AnyRoute) => {
    let phases = [...route.phases];
    let phase = phases.pop()!;
    phases.push({
      ...phase,
      routes: [...phase.routes, ...children],
    });

    return {
      ...route,
      phases,
    };
  });
}

// Distribute over unions so Fold can retain its conservative union handling.
type Normalized<E extends Input> = E extends Unary ? E
  : E extends AnyRoute ? RoutesElement<readonly [E]>
  : never;

type Invalid<S, E extends readonly Input[]> = E extends readonly [
  infer Head extends Input,
  ...infer Tail extends readonly Input[],
]
  ? Fold<S, readonly [Normalized<Head>]> extends infer Next
    ? [Next] extends [never] ? readonly [never, ...Tail]
    : readonly [Head, ...Invalid<Next, Tail>]
  : never
  : E;
