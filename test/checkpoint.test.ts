import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import * as z from "zod";
import { checkpoint, command, name, option, parse, schema } from "../mod.ts";

describe("checkpoint()", () => {
  it("validates sources and binds their values after resuming", () => {
    let app = command(
      name("server"),
      checkpoint(),
      option(name("port"), schema(z.number())),
    );
    let first = parse(app, { argv: [] });
    if (!first.ok) throw new Error("expected increment");

    expect(first.resume([{ name: "config", value: { port: 4100 } }]))
      .toMatchObject({
        ok: true,
        method: "execute",
        model: { port: 4100 },
      });
  });

  it("reports malformed sources through the ordinary issue path", () => {
    let app = command(name("server"), checkpoint());
    let first = parse(app, { argv: [] });
    if (!first.ok) throw new Error("expected increment");

    // @ts-expect-error JavaScript callers can supply invalid source arrays.
    expect(first.resume(null)).toMatchObject({
      ok: false,
      code: "unprocessable-content",
      issues: [{ message: "expected an array of value sources" }],
    });

    // @ts-expect-error JavaScript callers can supply invalid source entries.
    expect(first.resume([null, { name: 123 }])).toMatchObject({
      ok: false,
      code: "unprocessable-content",
      issues: [
        { message: "expected a value source", path: [0] },
        { message: "expected a string", path: [1, "name"] },
        { message: "expected a value", path: [1, "value"] },
      ],
    });
  });

  it("accepts an explicit undefined source value", () => {
    let app = command(
      name("server"),
      checkpoint(),
      option(name("port"), schema(z.number().default(4100))),
    );
    let first = parse(app, { argv: [] });
    if (!first.ok) throw new Error("expected increment");

    expect(first.resume([{ name: "config", value: undefined }])).toMatchObject({
      ok: true,
      method: "execute",
      model: { port: 4100 },
    });
  });
});
