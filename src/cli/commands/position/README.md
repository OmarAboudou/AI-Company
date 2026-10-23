# `aico position`

Opening, filling and closing the company's positions: `create`, alias `open`, and `delete`, alias `close`; `assign` and `unassign` for the default employee; `assign-temporarily`, alias `interim`, and `unassign-temporarily`, alias `end-interim`, for a temporary one, kept on this machine.

## Invariants

- A position's default employee, or its temporary assignment, is replaced only with `--replace`.

## Decisions

- [#7](https://github.com/OmarAboudou/LLM-Company/issues/7): positions, apart from the employees who fill them.
- [#24](https://github.com/OmarAboudou/LLM-Company/issues/24): `assign`, `unassign` and `--replace`.
- [#41](https://github.com/OmarAboudou/LLM-Company/issues/41): `update`, `update-id` and `delete`.
- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): `assign-temporarily` and `unassign-temporarily`.
