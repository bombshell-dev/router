# @bomb.sh/router

**A statically typed entry-point router for command-line applications.**

An argument parser tells you what the user typed. `@bomb.sh/router` tells you
where and how they intend to enter your program. For execution, it binds a
validated, statically typed model for that entry point.

`@bomb.sh/router` matches input to an intent: a method at an
application-relative route, such as:

```text
HELP    /
VERSION /
EXECUTE /serve
HELP    /database/clean
EXECUTE /database/clean
```

Every reachable intent appears in the result type. Narrow `method` and `route`,
and TypeScript knows the exact model available at that entry point.

`@bomb.sh/router` is not a CLI framework. It does not own handlers, effects,
output, or process lifetime. It is not a CLI parser whose product is a bag of
flags. Its product is a typed intent; your application decides what that intent
does.

## Define every way into the program

`route()` declares an address, and every `command()` is just an address that
declares an intent to execute. Every route supports help, whereas version and
execution exist only where they are explicitly added.

Definitions are immutable composition pipelines, not handler registrations:

```ts
import {
  command,
  description,
  name,
  option,
  route,
  schema,
  toggle,
  version,
} from "@bomb.sh/router";
import * as z from "zod";

export const app = command(
  name("simulacrum"),
  description("Run and manage local service simulators."),
  version("1.0.0"),
  toggle(name("verbose")),
  command(
    name("serve"),
    option(name("port"), schema(z.number().default(4000))),
  ),
  route(
    name("database"),
    command(
      name("clean"),
      toggle(name("dryRun")),
    ),
  ),
);
```

That definition makes these entry points—and no others—reachable:

```text
HELP /                  VERSION /              EXECUTE /
HELP /serve                                    EXECUTE /serve
HELP /database
HELP /database/clean                           EXECUTE /database/clean
```

Nest `route()` and `command()` directly inside another route, command, or
`extend()`. Each child is mounted at that point in the pipeline. Use `extend()`
to package reusable groups of children and other elements.

The root name identifies the executable; it is not repeated in route IDs.
`simulacrum serve` therefore selects `/serve`, not `/simulacrum/serve`.

## Route an intent

`parse()` returns a discriminated union of the reachable entry points. Dispatch
can stay flat even when the route tree is deep:

```ts
import process from "node:process";
import { parse, printErrors, printHelp, printVersion } from "@bomb.sh/router";
import { app } from "./app.ts";

const result = parse(app, { argv: process.argv.slice(2) });

if (!result.ok) {
  console.error(printErrors(result));
  process.exit(1);
}

switch (result.method) {
  case "help":
    console.log(printHelp(result));
    break;

  case "version":
    console.log(printVersion(result));
    break;

  case "execute":
    switch (result.route) {
      case "/":
        result.model.verbose; // boolean
        break;

      case "/serve":
        result.model.port; // number
        result.models["/"].verbose; // boolean
        break;

      case "/database/clean":
        result.model.dryRun; // boolean
        result.models["/"]; // { verbose: boolean }
        result.models["/database"]; // {}
        break;
    }
}
```

An execute intent has two views of configuration:

- `model` is owned by the selected route.
- `models` contains the statically typed model for every route along the
  selected path. Sibling routes are absent from both the value and its type.

| Invocation                            | Intent and model                                                    |
| ------------------------------------- | ------------------------------------------------------------------- |
| `simulacrum --verbose`                | `EXECUTE /` with `{ verbose: true }`                                |
| `simulacrum serve --port 4100`        | `EXECUTE /serve` with `{ port: 4100 }`                              |
| `simulacrum database clean --dry-run` | `EXECUTE /database/clean` with `{ dryRun: true }`                   |
| `simulacrum --help database clean`    | `HELP /database/clean`; controls target the deepest selected route  |
| `simulacrum database`                 | `method-not-allowed`; `/database` does not support execution        |
| `simulacrum serve --port nope`        | `unprocessable-content`; invalid data never reaches the application |

Command literals are routing tokens, not positional arguments. As route segments
become discoverable, `@bomb.sh/router` scopes parameter binding to the segment
that owns each token. This makes identical option names on parent and child
routes unambiguous.

## Bind route parameters from multiple sources

CLI arguments are only one source. `@bomb.sh/router` can bind JavaScript values
and flat environment records onto the same route-local models:

```ts
const result = parse(app, {
  argv: process.argv.slice(2),
  values: [{
    name: "config.json",
    value: { serve: { port: 4200 } },
  }],
  envs: [{
    name: "process",
    value: process.env,
  }],
});
```

For `/serve`, `serve.port` and `SERVE_PORT` both address its `port` parameter.
CLI text and environment text are decoded; JavaScript values are used directly.
The resulting value is then validated by its
[Standard Schema](https://standardschema.dev/) schema. Zod, ArkType, Valibot,
and other conforming libraries work without adapters.

Source precedence is explicit:

```text
CLI → environment → JavaScript values → schema default
```

## Pause without surrendering the type system

Sometimes the route cannot be fully configured, or even fully discovered, until
the application performs I/O. `@bomb.sh/router` can pause at a typed checkpoint
and resume with the result.

Dynamic phases serve two common cases:

- Load a configuration file, then use its contents as value sources for later
  parameters.
- Load plugins, then extend the route graph with their options and routes.

`checkpoint()` is the configuration-file convenience; `dynamic()` is the general
route-extension mechanism. Both keep I/O in the application while preserving the
exact type of what parsing can produce next.

`dynamic(schema, extension)` requires a Standard Schema for the value supplied
to `resume()`. The schema's input type determines what `resume()` accepts; its
validated output is passed to the extension, including any schema transforms.

```ts
import { command, dynamic, extend, name, parse } from "@bomb.sh/router";
import * as z from "zod";

const app = command(
  name("plugins"),
  dynamic(
    z.array(z.string()),
    (plugins) => extend(...plugins.map((plugin) => command(name(plugin)))),
  ),
);

const step = parse(app, { argv: ["serve"] });
if (step.ok) {
  const result = step.resume(["serve"]); // EXECUTE /serve
}
```

Invalid input produces `unprocessable-content` with the schema's issues and
paths, without applying the extension. Validation must be synchronous; async
schemas also produce `unprocessable-content`.

### Help and version cross checkpoints

`--help` and `--version` request methods; they do not settle an intent or bypass
parsing. `@bomb.sh/router` cannot produce either intent until it knows the
deepest selected route. A dynamic phase may introduce that route, its options,
or its version.

The driver must therefore resume every increment until parsing returns an
intent—even when the arguments contain `--help` or `--version`. This applies
recursively when one continuation exposes another increment.

```text
app --config app.json auth0 --help
  → bind the configuration phase
  → load configuration and resume
  → discover /auth0
  → HELP /auth0
```

Help and version are not escape hatches around configuration loading. Do not
inspect `argv` to skip a checkpoint. A phase may be required by `HELP`,
`VERSION`, or `EXECUTE`, so its driver work must be safe for all three: handle
loading failures in the application, avoid command side effects, and defer
execution until an `EXECUTE` intent. If discovery fails, report that failure
rather than printing incomplete help for an unresolved route graph. Routes
without dynamic phases still resolve directly; the rule is to stop only at an
intent or failure, never merely because the arguments look informational.

```ts
import process from "node:process";
import {
  checkpoint,
  command,
  name,
  option,
  parse,
  printErrors,
  printHelp,
  printVersion,
  schema,
  type ValueSource,
  version,
} from "@bomb.sh/router";
import * as z from "zod";

const app = command(
  name("server"),
  version("1.0.0"),
  option(name("config"), schema(z.string())),
  checkpoint(),
  option(name("port"), schema(z.number())),
);

const step = parse(app, { argv: process.argv.slice(2) });

if (!step.ok) {
  console.error(printErrors(step));
  process.exit(1);
}

step.model.config; // string—the model resolved before the checkpoint

const loaded = await load(step.model.config);
const result = step.resume(loaded);

if (!result.ok) {
  console.error(printErrors(result));
  process.exit(1);
}

switch (result.method) {
  case "help":
    console.log(printHelp(result));
    break;

  case "version":
    console.log(printVersion(result));
    break;

  case "execute":
    result.model; // { config: string; port: number }
    break;
}

declare function load(path: string): Promise<ValueSource[]>;
```

The parser remains synchronous and performs no I/O. The caller loads the file
and resumes directly with a value-source array. `checkpoint()` validates the
source names and the presence of their values; later parameter schemas validate
the contents. The application handles I/O failures before resuming. Unconsumed
CLI input survives the pause, so a later `--port 5000` can override the value
loaded from the file.

The same phase mechanism can add options or routes from runtime data. Parsing
then continues against the expanded route graph, and the continuation type
describes the entry points that can appear next.
