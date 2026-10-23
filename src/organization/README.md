# Organization

How the company is organized: the company itself, the positions it opens, the employees who fill them, and the people at the keyboard, who act as directors or as fictitious human employees.

Management writes it through the command line or by hand, and git versions it. Two things stay out of git: a position's temporary assignment, kept on the machine that made it, and who is at the keyboard, kept in each shell.

## Invariants

- AICo never leaves a reference to something that doesn't exist: an operation that would break one is refused, or rewrites it, as renaming an employee rewrites the positions it fills.

## Decisions

- [#7](https://github.com/OmarAboudou/LLM-Company/issues/7): positions are separate from the employees who fill them.
- [#24](https://github.com/OmarAboudou/LLM-Company/issues/24): an employee is an LLM or a human, and a position names the employee filling it.
- [#41](https://github.com/OmarAboudou/LLM-Company/issues/41): everything created can be updated and deleted.
- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): the director's position, the people at the keyboard, temporary assignments and the id history.
