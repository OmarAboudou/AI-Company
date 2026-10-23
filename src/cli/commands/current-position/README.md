# `aico current-position`

The position you work from in this shell, as an e-mail's From line: the task and turn commands use it until `clear`. Its `set` and `clear` need AICo's shell function.

## Invariants

- Only a position you work can be selected, and a selected position you no longer work is refused rather than replaced.

## Decisions

- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the selected position.
