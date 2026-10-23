# The human at the keyboard

The human at the keyboard is who acts in a shell: a director by default, one of the people working on the repository, whom git names; or a fictitious human employee, set with `aico current-human set` and kept in the shell's environment until `clear`.

They act from the positions they work: a director, the director's position and those assigned temporarily to the directors; a human employee, those it works by default or temporarily. A position selected with `aico current-position set` narrows them to one, as an e-mail's From line does.

## Invariants

- An LLM employee is never at the keyboard: only a human employee can be set as the current human.
- Becoming a director again is a command of its own: setting the current human always names an employee, so a forgotten id never gives anyone the management commands.
- A person writes, and works tasks, only from a position they work, never on behalf of a position an LLM works: a director assigns it to them temporarily first, so that authorship stays true.
- A selected position the person no longer works is refused rather than replaced, and changing who is at the keyboard clears it.

## Decisions

- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): directors and fictitious human employees, the current human and the selected position.
- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): people work their positions' tasks as LLM employees do.
