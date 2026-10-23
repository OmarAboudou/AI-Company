# The human at the keyboard

The human at the keyboard is who acts in a shell: a director, one of the people working on the repository, whom git names.

They act from the positions the directors work: the director's position and those assigned temporarily to the directors. A position selected with `aico current-position set`, kept in the shell's environment until `clear`, narrows them to one, as an e-mail's From line does.

## Invariants

- A person writes, and works tasks, only from a position the directors work, never on behalf of a position an employee works: a director assigns it to the directors temporarily first, so that authorship stays true.
- A selected position the directors no longer work is refused rather than replaced.

## Decisions

- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the directors and the selected position.
- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): people work their positions' tasks as LLM employees do.
