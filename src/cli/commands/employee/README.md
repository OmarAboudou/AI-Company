# `aico employee`

Hiring employees, changing them and letting them go: `create`, alias `hire`; `update` and `update-id`; `replace`, alias `hand-over`, which gives all of an employee's positions to another one; and `delete`, alias `fire`.

## Invariants

- `replace` hands over every position the employee holds.
- An employee id found in the archives is given again only with `--reuse-id`.

## Decisions

- [#24](https://github.com/OmarAboudou/AI-Company/issues/24): employees, and their kind as a subcommand of `create`.
- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): `update`, `update-id`, `replace` and `delete`, with `--force`.
- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): `--reuse-id`.
