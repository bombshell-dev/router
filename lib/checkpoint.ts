import { dynamic } from "./dynamic.ts";
import type { DynamicElement } from "./pipeline.ts";
import type { Issue, Schema } from "./types.ts";
import { type ValueSource, withValues } from "./values.ts";

export function checkpoint(): DynamicElement<
  ValueSource[],
  ReturnType<typeof withValues>
> {
  return dynamic(sources, (values) => withValues(values));
}

const sources: Schema<ValueSource[]> = {
  "~standard": {
    version: 1,
    vendor: "@bomb.sh/router",
    validate(value) {
      if (!Array.isArray(value)) {
        return { issues: [{ message: "expected an array of value sources" }] };
      }

      let issues: Issue[] = [];
      for (let [index, source] of value.entries()) {
        if (source === null || typeof source !== "object") {
          issues.push({ message: "expected a value source", path: [index] });
          continue;
        }

        if (typeof source.name !== "string") {
          issues.push({ message: "expected a string", path: [index, "name"] });
        }
        if (!("value" in source)) {
          issues.push({ message: "expected a value", path: [index, "value"] });
        }
      }

      return issues.length > 0 ? { issues } : { value: value as ValueSource[] };
    },
  },
};
