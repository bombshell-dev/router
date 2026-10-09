import { type Input, type Normalize, normalize } from "./route.ts";
import { brand, type Extension } from "./pipeline.ts";

export function extend<const E extends readonly Input[]>(
  ...elements: E
): Extension<Normalize<E>> {
  let normalized = normalize(elements);
  return brand<Extension<Normalize<E>>>((start: unknown): unknown =>
    normalized.reduce<unknown>(
      (value, element) => element(value as never),
      start,
    )
  );
}
