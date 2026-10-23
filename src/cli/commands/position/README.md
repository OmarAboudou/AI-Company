# `aico position`

Opening, giving and closing the company's positions: `create`, alias `open`, and `delete`, alias `close`; `assign`, which gives a position to an LLM employee, and `unassign`, which gives it back to the directors.

## Invariants

- The employee holding a position is replaced only with `--replace`.

## Decisions

- [#7](https://github.com/OmarAboudou/AI-Company/issues/7): positions, apart from the employees who fill them.
- [#24](https://github.com/OmarAboudou/AI-Company/issues/24): `assign`, `unassign` and `--replace`.
- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): `update`, `update-id` and `delete`.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): `unassign` gives the position back to the user, temporary assignments gone.
