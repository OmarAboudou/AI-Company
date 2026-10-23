# `aico current-human`

Who is at the keyboard in this shell: a director by default, or a fictitious human employee, from `set` until `clear`. Its alias, `whoami`, is the idiom, as `hire` is for `create`.

`set` and `clear` change the shell's environment, which a program can't do for the shell that started it: AICo's shell function evaluates the code they print, and without it they refuse, saying how to set it up. A script sets `AICO_CURRENT_HUMAN_ID` itself.

## Invariants

- Becoming a director again is `clear`, a command of its own: `set` always names an employee, so a forgotten id never gives anyone the management commands.
- Changing who is at the keyboard clears the selected position.

## Decisions

- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): the human at the keyboard, and `current-human` replacing `switch-human`.
