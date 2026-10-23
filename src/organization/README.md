# Organization

How the company is organized: the company itself and the project it carries out, the positions it opens, the employees who fill them, and the people at the keyboard, who act as directors.

Management writes it through the command line or by hand, and git versions it, on the reserved branch. Only the position selected in each shell stays out of git.

## Invariants

- AICo never leaves a reference to something that doesn't exist: an operation that would break one is refused, or rewrites it, as renaming an employee rewrites the positions it fills.

## Decisions

- [#7](https://github.com/OmarAboudou/AI-Company/issues/7): positions are separate from the employees who fill them.
- [#24](https://github.com/OmarAboudou/AI-Company/issues/24): a position names the employee filling it.
- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): everything created can be updated and deleted.
- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the director's position, the people at the keyboard and the id history.
- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): the project's description.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): a position's single holder, the user or an LLM employee.
