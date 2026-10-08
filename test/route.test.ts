import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { type } from "arktype";
import * as z from "zod";
import { command } from "../lib/command.ts";
import { dynamic } from "../lib/dynamic.ts";
import { extend } from "../lib/extend.ts";
import { parse } from "../lib/parse.ts";
import { description, name } from "../lib/definition.ts";
import { option } from "../lib/option.ts";
import { schema } from "../lib/param.ts";
import { mark, type Transform } from "../lib/pipeline.ts";
import { route, type RouteZero, version } from "../lib/route.ts";
import { toggle } from "../lib/toggle.ts";
import type { AnyRoute, ChildrenOf, Done, ModelOf } from "../lib/types.ts";

describe("route() types", () => {
  it("preserves the literal route name through each element", () => {
    let result = route(
      name("simulacrum"),
      option(name("port"), schema(type("number"))),
      option(name("domain"), schema(type("string"))),
    );

    expectType<Equal<typeof result.name, "simulacrum">>(true);
  });

  it("starts with help as its only supported method", () => {
    let result = route(name("simulacrum"));

    expectType<Equal<Methods<typeof result>, "help">>(true);
  });

  it("accepts shared definition elements in the route pipeline", () => {
    let result = route(
      name("simulacrum"),
      description("manage service simulators"),
    );

    expect(result.description).toBe("manage service simulators");
    expectType<Equal<typeof result, RouteZero<"simulacrum">>>(true);
  });

  it("preserves supported methods while adding options", () => {
    let result = route(
      name("simulacrum"),
      option(name("port"), schema(type("number"))),
    );

    expectType<Equal<Methods<typeof result>, "help">>(true);
  });

  it("adds version to the supported methods", () => {
    let result = route(
      name("simulacrum"),
      option(name("port"), schema(type("number"))),
      version("1.2.0"),
    );

    expectType<Equal<Methods<typeof result>, "help" | "version">>(true);
    expectType<Equal<ModelOf<typeof result>, { port: number }>>(true);
  });

  it("infers a plain object model from option schema outputs", () => {
    let result = route(
      name("simulacrum"),
      option(name("port"), schema(type("number"))),
    );

    expectType<Equal<ModelOf<typeof result>, { port: number }>>(true);
  });

  it("preserves exact option keys and values across several elements", () => {
    let result = route(
      name("simulacrum"),
      option(name("port"), schema(type("number"))),
      option(name("domain"), schema(type("string"))),
    );

    expectType<
      Equal<ModelOf<typeof result>, { port: number; domain: string }>
    >(true);
    expectType<
      Equal<
        typeof result.phases,
        readonly [Done<{ port: number; domain: string }, []>]
      >
    >(true);
  });

  it("adds toggle output to the phase that declares it", () => {
    let result = route(
      name("simulacrum"),
      option(name("config"), schema(type("string"))),
      toggle(name("dryRun")),
    );

    expectType<
      Equal<ModelOf<typeof result>, { config: string; dryRun: boolean }>
    >(true);
    expectType<
      Equal<
        typeof result.phases,
        readonly [Done<{ config: string; dryRun: boolean }, []>]
      >
    >(true);
  });

  it("adds child routes to the phase that declares them", () => {
    let serve = route(
      name("serve"),
      option(name("port"), schema(type("number"))),
    );
    let result = route(
      name("simulacrum"),
      serve,
    );

    expectType<
      Equal<ChildrenOf<typeof result>, readonly [typeof serve]>
    >(true);
    expectType<
      Equal<
        typeof result.phases,
        readonly [Done<{}, readonly [typeof serve]>]
      >
    >(true);
  });

  it("rejects a first value that is not a Definition", () => {
    check(() => {
      // @ts-expect-error route() must start with a Route.
      route("simulacrum");
    });
  });

  it("rejects adjacent elements whose output and input do not align", () => {
    let start = name("simulacrum");
    let count = (_value: typeof start): number => 1;
    let label = (_value: string): string => "done";

    check(() => {
      // @ts-expect-error label cannot consume the number returned by count.
      route(start, count, label);
    });
  });

  it("allows an explicit final element to transform a Route into another type", () => {
    interface Bloop extends Transform {
      readonly input: AnyRoute;
      readonly output: BloopValue<this["input"]>;
    }

    let result = route(
      name("simulacrum"),
      mark<Bloop>((value: AnyRoute) => ({
        type: "bloop" as const,
        route: value,
      })),
    );

    expectType<Equal<typeof result.type, "bloop">>(true);
    expectType<Equal<typeof result.route.name, "simulacrum">>(true);
  });

  it("preserves inference across thirty route elements", () => {
    let result = route(
      name("simulacrum"),
      option(name("one"), schema(type("string"))),
      option(name("two"), schema(type("number"))),
      option(name("three"), schema(type("boolean"))),
      option(name("four"), schema(type("string"))),
      option(name("five"), schema(type("number"))),
      option(name("six"), schema(type("boolean"))),
      option(name("seven"), schema(type("string"))),
      option(name("eight"), schema(type("number"))),
      option(name("nine"), schema(type("boolean"))),
      option(name("ten"), schema(type("string"))),
      option(name("eleven"), schema(type("number"))),
      option(name("twelve"), schema(type("boolean"))),
      option(name("thirteen"), schema(type("string"))),
      option(name("fourteen"), schema(type("number"))),
      option(name("fifteen"), schema(type("boolean"))),
      option(name("sixteen"), schema(type("string"))),
      option(name("seventeen"), schema(type("number"))),
      option(name("eighteen"), schema(type("boolean"))),
      option(name("nineteen"), schema(type("string"))),
      option(name("twenty"), schema(type("number"))),
      option(name("twentyOne"), schema(type("boolean"))),
      option(name("twentyTwo"), schema(type("string"))),
      option(name("twentyThree"), schema(type("number"))),
      option(name("twentyFour"), schema(type("boolean"))),
      option(name("twentyFive"), schema(type("string"))),
      option(name("twentySix"), schema(type("number"))),
      option(name("twentySeven"), schema(type("boolean"))),
      option(name("twentyEight"), schema(type("string"))),
      option(name("twentyNine"), schema(type("number"))),
      option(name("thirty"), schema(type("boolean"))),
    );

    expectType<
      Equal<
        ModelOf<typeof result>,
        {
          one: string;
          two: number;
          three: boolean;
          four: string;
          five: number;
          six: boolean;
          seven: string;
          eight: number;
          nine: boolean;
          ten: string;
          eleven: number;
          twelve: boolean;
          thirteen: string;
          fourteen: number;
          fifteen: boolean;
          sixteen: string;
          seventeen: number;
          eighteen: boolean;
          nineteen: string;
          twenty: number;
          twentyOne: boolean;
          twentyTwo: string;
          twentyThree: number;
          twentyFour: boolean;
          twentyFive: string;
          twentySix: number;
          twentySeven: boolean;
          twentyEight: string;
          twentyNine: number;
          thirty: boolean;
        }
      >
    >(true);
  });
});

describe("direct child composition", () => {
  it("preserves nested paths, methods, and models", () => {
    let clean = command(name("clean"), toggle(name("dryRun")));
    let database = route(name("database"), clean);
    let serve = command(
      name("serve"),
      option(name("port"), schema(type("number"))),
      version("1.0.0"),
    );
    let app = command(
      name("app"),
      toggle(name("verbose")),
      database,
      extend(route(name("status"))),
      serve,
    );
    let wrapped = command(
      name("app"),
      toggle(name("verbose")),
      extend(route(name("database"), extend(clean))),
      extend(route(name("status"))),
      extend(serve),
    );

    expectType<Equal<typeof app, typeof wrapped>>(true);
    let result = parse(app, {
      argv: ["--verbose", "database", "clean", "--dry-run"],
    });
    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      route: "/database/clean",
      model: { dryRun: true },
      models: {
        "/": { verbose: true },
        "/database": {},
        "/database/clean": { dryRun: true },
      },
    });
    if (!result.ok || result.method !== "execute") {
      throw Error("expected execute");
    }
    if (result.route === "/database/clean") {
      expectType<Equal<typeof result.model, { dryRun: boolean }>>(true);
    }
    if (result.route === "/serve") {
      expectType<Equal<typeof result.model, { port: number }>>(true);
    }
    expect(parse(app, { argv: ["database", "--help"] })).toMatchObject({
      ok: true,
      method: "help",
      route: "/database",
    });
    expect(parse(app, { argv: ["serve", "--version"] })).toMatchObject({
      ok: true,
      method: "version",
      route: "/serve",
    });
    expect(parse(app, { argv: ["database"] })).toMatchObject({
      ok: false,
      code: "method-not-allowed",
      route: "/database",
    });
  });

  it("packages children in reusable extensions and applies them directly", () => {
    let child = command(name("child"), toggle(name("enabled")));
    let extension = extend(child, toggle(name("verbose")));
    let app = extension(command(name("app")));
    let nested = route(name("app"), route(name("group"), extension));

    expectType<Equal<ModelOf<typeof app>, { verbose: boolean }>>(true);
    expectType<
      Equal<ModelOf<typeof nested, "/group/child">, { enabled: boolean }>
    >(true);
    expect(parse(app, { argv: ["--verbose", "child", "--enabled"] }))
      .toMatchObject({
        ok: true,
        method: "execute",
        route: "/child",
        models: { "/": { verbose: true }, "/child": { enabled: true } },
      });
    expect(parse(nested, { argv: ["group", "child"] })).toMatchObject({
      ok: true,
      method: "execute",
      route: "/group/child",
      model: { enabled: false },
    });
  });

  it("introduces children through a dynamic extension", () => {
    let app = command(
      name("app"),
      dynamic(type("number"), (port) =>
        extend(
          command(
            name("serve"),
            option(name("port"), schema(z.number().default(port))),
          ),
        )),
      command(name("clean")),
    );
    let first = parse(app, { argv: ["serve"] });
    if (!first.ok) throw Error("expected increment");
    let result = first.resume(4000);
    expect(result).toMatchObject({
      ok: true,
      method: "execute",
      route: "/serve",
      model: { port: 4000 },
    });
    if (!result.ok || result.method !== "execute") {
      throw Error("expected execute");
    }
    if (result.route === "/serve") {
      expectType<Equal<typeof result.model, { port: number }>>(true);
    }
    let clean = parse(app, { argv: ["clean"] });
    if (!clean.ok) throw Error("expected increment");
    expect(clean.resume(4000)).toMatchObject({
      ok: true,
      method: "execute",
      route: "/clean",
      model: {},
    });
  });

  it("retains conservative inference for arrays and unions", () => {
    let children = [command(name("child"))];
    let app = route(name("app"), ...children);
    expectType<Equal<typeof app, AnyRoute>>(true);
    let child = Math.random() > 0.5 ? command(name("one")) : route(name("two"));
    let union = command(name("app"), child);
    expectType<Equal<typeof union, AnyRoute>>(true);
  });

  it("rejects children after non-route outputs and in parameter pipelines", () => {
    let child = command(name("child"));
    let count = (_value: AnyRoute) => 1;
    check(() => {
      // @ts-expect-error a child cannot be mounted on a number.
      route(name("app"), count, child);
      // @ts-expect-error a child cannot be mounted on a number.
      command(name("app"), count, child);
      // @ts-expect-error options accept parameter transformations.
      option(name("port"), child);
      // @ts-expect-error a child extension requires a route.
      option(name("port"), extend(child));
      // @ts-expect-error the parameter schema cannot follow a child operation.
      route(name("app"), child, schema(type("number")));
    });
  });
});

type Equal<L, R> = (<T>() => T extends L ? 1 : 2) extends
  (<T>() => T extends R ? 1 : 2)
  ? (<T>() => T extends R ? 1 : 2) extends (<T>() => T extends L ? 1 : 2) ? true
  : false
  : false;

type Methods<R extends { readonly methods: readonly unknown[] }> =
  R["methods"][number];

function expectType<T extends true>(_value: T): void {
  // Compile-time assertion.
}

function check(_body: () => void): void {
  // Compile the callback without executing it.
}

interface BloopValue<R> {
  readonly type: "bloop";
  readonly route: R;
}
