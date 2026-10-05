import type { AnyRoute, Schema } from "./types.ts";
import {
  type AnyElement,
  brand,
  type DynamicElement,
  type Element,
} from "./pipeline.ts";

export type { ConjoinPhases, Seed } from "./pipeline.ts";
export type PhaseOf<R extends AnyRoute> = R["phases"][0];
export type PhasesOf<R extends AnyRoute> = R["phases"];

// Constrain only the brand while inferring E. The full operation would
// contextually widen extend() tuples and erase their continuation types.
export function dynamic<
  Input,
  Output,
  E extends Element,
>(
  schema: Schema<Input, Output>,
  extension: (requires: Output) => E,
): DynamicElement<Input, Extract<E, AnyElement>> {
  return brand<DynamicElement<Input, Extract<E, AnyElement>>>(
    (route: AnyRoute) => {
      let phases = [...route.phases];
      let phase = phases.pop()!;

      phases.push({
        ...phase,
        resolver(requirement: never) {
          let result = schema["~standard"].validate(requirement);

          if (result instanceof Promise) {
            return {
              ok: false,
              issues: [{ message: "async schemas are not allowed" }],
            };
          }

          if (result.issues) {
            return { ok: false, issues: result.issues };
          }

          return {
            ok: true,
            value: extension(result.value) as unknown as (
              input: never,
            ) => AnyRoute,
          };
        },
      });
      phases.push({
        model: {
          params: {},
          steps: [],
        },
        routes: [],
        values: [],
        envs: [],
      });

      return { ...route, phases };
    },
  );
}
