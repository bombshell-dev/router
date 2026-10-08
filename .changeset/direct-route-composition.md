---
"@bomb.sh/router": minor
---

Allow `route()`, `command()`, and `extend()` to accept child routes and commands
directly, preserving inferred route paths, methods, and models.

The public `routes()` helper has been removed. Pass children directly inside
`route()` and `command()`, and use `extend(child, other)` for reusable groups or
dynamic resolver results.
