# Project

The project is what the company carries out, one per company: its description, short, which every session is given beside its position's. Whoever runs the company keeps the detailed vision and its direction; the description tells the employees what they need of them.

## Invariants

- The description lives with the company, on its reserved branch, rather than next to the project's README: the project's own branches carry only the project.
- `aico project update` replaces the description as a whole.

## Decisions

- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): the project's description lives on the reserved branch, and replaces the company's.
