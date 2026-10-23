# `aico employee`

Hiring employees, changing them and letting them go: `create`, alias `hire`; `update` and `update-id`; `replace`, alias `hand-over`, which gives all of an employee's positions to another one; and `delete`, alias `fire`.

## Invariants

- An employee's kind never changes: `replace` hands its positions over to another employee instead.
- `replace` hands over the positions the employee works by default, and its temporary assignments only with `--temporary`.
- An employee id found in the archives is given again only with `--reuse-id`.

## Decisions

- [#24](https://github.com/OmarAboudou/LLM-Company/issues/24): employees, and their kind as a subcommand of `create`.
- [#41](https://github.com/OmarAboudou/LLM-Company/issues/41): `update`, `update-id`, `replace` and `delete`, with `--force`.
- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): `--reuse-id`, and the temporary assignments `replace` hands over.
