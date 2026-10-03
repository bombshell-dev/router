import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { type } from "arktype";
import * as z from "zod";
import { dynamic } from "../lib/dynamic.ts";
import { extend } from "../lib/extend.ts";
import type { AnyParam, Param } from "../lib/param.ts";
import { brand, type IdentityElement } from "../lib/pipeline.ts";
import { routes } from "../lib/route.ts";
import {
  command,
  type ModelOf,
  multiple,
  name,
  option,
  param,
  parse,
  type ReadCLI,
  schema,
} from "../mod.ts";

describe("multiple()", () => {
  it("changes parameter cardinality without changing its model", () => {
    let result = param(
      name("config"),
      schema(z.array(z.string())),
      multiple(),
    );

    expectType<
      Equal<typeof result, Param<"config", string[], "many">>
    >(true);
  });

  it("preserves the schema output as the model type", () => {
    let app = command(
      name("simulacrum"),
      option(
        name("config"),
        multiple(),
        schema(z.array(z.string()).transform((values) => new Set(values))),
      ),
    );

    expectType<Equal<ModelOf<typeof app>, { config: Set<string> }>>(true);
  });

  it("composes on either side of schema()", () => {
    command(
      name("before"),
      option(name("config"), multiple(), schema(type("string[]"))),
    );
    command(
      name("after"),
      option(name("config"), schema(type("string[]")), multiple()),
    );
  });

  it("collects repeated option representations in argv order", () => {
    let app = command(
      name("simulacrum"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
      option(name("port"), schema(z.number())),
    );
    let result = parse(app, {
      argv: ["--config", "one", "--port", "4100", "--config=two"],
    });

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      model: { config: ["one", "two"], port: 4100 },
    });
  });

  it("decodes every representation with one consistent alternative", () => {
    let app = command(
      name("simulacrum"),
      option(name("port"), multiple(), schema(z.array(z.number()))),
    );
    let result = parse(app, {
      argv: ["--port", "4100", "--port", "4101"],
    });

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      model: { port: [4100, 4101] },
    });
  });

  it("preserves numeric-looking strings as one aggregate alternative", () => {
    let app = command(
      name("simulacrum"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
    );
    let result = parse(app, {
      argv: ["--config", "0012", "--config", "0034"],
    });

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      model: { config: ["0012", "0034"] },
    });
  });

  it("does not form mixed Cartesian interpretations", () => {
    let app = command(
      name("simulacrum"),
      option(
        name("value"),
        multiple(),
        schema(z.tuple([z.number(), z.string()])),
      ),
    );
    let result = parse(app, {
      argv: ["--value", "1", "--value", "2"],
    });

    expect(result).toMatchObject({
      ok: false,
      code: "unprocessable-content",
      issues: [{ path: ["value"] }],
    });
  });

  it("lets an optional schema interpret total source absence", () => {
    let app = command(
      name("simulacrum"),
      option(
        name("config"),
        multiple(),
        schema(z.array(z.string()).optional()),
      ),
    );

    expect(parse(app, { argv: [] })).toMatchObject({
      ok: true,
      method: "execute",
      model: { config: undefined },
    });
  });

  it("lets a defaulting schema interpret total source absence", () => {
    let app = command(
      name("simulacrum"),
      option(
        name("config"),
        multiple(),
        schema(z.array(z.string()).default(["default.yml"])),
      ),
    );

    expect(parse(app, { argv: [] })).toMatchObject({
      ok: true,
      method: "execute",
      model: { config: ["default.yml"] },
    });
  });

  it("lets an absent CLI source fall through to environment", () => {
    let app = command(
      name("simulacrum"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
    );
    let result = parse(app, {
      argv: [],
      envs: [{ name: "process", value: { CONFIG: "environment.yml" } }],
    });

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      model: { config: ["environment.yml"] },
    });
  });

  it("treats an environment string as one occurrence without splitting it", () => {
    let app = command(
      name("simulacrum"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
    );
    let result = parse(app, {
      argv: [],
      envs: [{
        name: "process",
        value: { CONFIG: "one.yml,two.yml" },
      }],
      values: [{
        name: "settings",
        value: { config: ["fallback-one.yml", "fallback-two.yml"] },
      }],
    });

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      model: { config: ["one.yml,two.yml"] },
    });
  });

  it("lets absent CLI and Env sources fall through to JavaScript values", () => {
    let app = command(
      name("simulacrum"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
    );
    let result = parse(app, {
      argv: [],
      values: [{
        name: "settings",
        value: { config: ["value.yml"] },
      }],
    });

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      model: { config: ["value.yml"] },
    });
  });

  it("prefers repeated CLI options over lower-priority sources", () => {
    let app = command(
      name("simulacrum"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
    );
    let result = parse(app, {
      argv: ["--config", "one.yml", "--config", "two.yml"],
      envs: [{ name: "process", value: { CONFIG: "environment.yml" } }],
      values: [{
        name: "settings",
        value: { config: ["value.yml"] },
      }],
    });

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      model: { config: ["one.yml", "two.yml"] },
    });
  });

  it("does not hide an incomplete occurrence with lower-priority sources", () => {
    let app = command(
      name("simulacrum"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
    );
    let result = parse(app, {
      argv: ["--config", "one.yml", "--config"],
      envs: [{ name: "process", value: { CONFIG: "environment.yml" } }],
      values: [{
        name: "settings",
        value: { config: ["value.yml"] },
      }],
    });

    expect(result).toMatchObject({
      ok: false,
      code: "unprocessable-content",
      issues: [{ message: "--config requires a value" }],
    });
  });

  it("preserves successful-read diagnostics when a later occurrence fails", () => {
    let app = command(
      name("simulacrum"),
      option(
        name("config"),
        multiple(),
        deprecated(),
        schema(z.array(z.string())),
      ),
    );
    let result = parse(app, {
      argv: ["--config", "one.yml", "--config"],
    });

    expect(result).toMatchObject({
      ok: false,
      code: "unprocessable-content",
      issues: [
        { message: "--config is deprecated" },
        { message: "--config requires a value" },
      ],
    });
  });

  it("collects occurrences through a custom singular reader", () => {
    let app = command(
      name("simulacrum"),
      option(
        name("plugin"),
        multiple(),
        custom("--plugin"),
        schema(z.array(z.string())),
      ),
    );
    let result = parse(app, {
      argv: ["--plugin", "one", "--plugin", "two"],
    });

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      model: { plugin: ["one", "two"] },
    });
  });

  it("does not capture occurrences across a known child selector", () => {
    let child = command(
      name("child"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
    );
    let app = command(
      name("simulacrum"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
      routes(child),
    );
    let result = parse(app, {
      argv: [
        "--config",
        "root.yml",
        "child",
        "--config",
        "child.yml",
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      route: "/child",
      models: {
        "/": { config: ["root.yml"] },
        "/child": { config: ["child.yml"] },
      },
    });
  });

  it("finalizes safely visible occurrences before a dynamic route is known", () => {
    let child = command(
      name("child"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
    );
    let app = command(
      name("simulacrum"),
      option(name("config"), multiple(), schema(z.array(z.string()))),
      dynamic(type("unknown"), () => extend(routes(child))),
    );
    let first = parse(app, {
      argv: [
        "--config",
        "root.yml",
        "child",
        "--config",
        "child.yml",
      ],
    });

    expect(first).toMatchObject({
      ok: true,
      route: "/",
      model: { config: ["root.yml"] },
    });
    expect("resume" in first).toBe(true);
    if (!("resume" in first)) return;

    let result = first.resume(undefined);

    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      route: "/child",
      models: {
        "/": { config: ["root.yml"] },
        "/child": { config: ["child.yml"] },
      },
    });
  });
});

function custom(flag: string): IdentityElement<AnyParam> {
  const read: ReadCLI = (tokens) => {
    let claim = tokens.claimPair((name, value) =>
      name.type === "flag" && name.text === flag && value.type === "word"
    );
    let [, value] = claim.tokens;

    return value
      ? {
        claim,
        result: {
          ok: true,
          value: { exists: true, value: value.text },
          issues: [],
        },
      }
      : {
        claim,
        result: {
          ok: true,
          value: { exists: false },
          issues: [],
        },
      };
  };

  return brand<IdentityElement<AnyParam>>(
    (param: AnyParam) => ({
      ...param,
      cli: { read },
    }),
  );
}

function deprecated(): IdentityElement<AnyParam> {
  return brand<IdentityElement<AnyParam>>(
    (param: AnyParam) => {
      let read = param.cli.read;
      return {
        ...param,
        cli: {
          ...param.cli,
          read(tokens: Parameters<ReadCLI>[0]) {
            let result = read(tokens);
            if (!result.result.ok || !result.result.value.exists) {
              return result;
            }
            return {
              ...result,
              result: {
                ...result.result,
                issues: [{ message: "--config is deprecated" }],
              },
            };
          },
        },
      };
    },
  );
}

type Equal<L, R> = (<T>() => T extends L ? 1 : 2) extends
  (<T>() => T extends R ? 1 : 2)
  ? (<T>() => T extends R ? 1 : 2) extends (<T>() => T extends L ? 1 : 2) ? true
  : false
  : false;

function expectType<T extends true>(_value: T): void {
  // Compile-time assertion.
}
