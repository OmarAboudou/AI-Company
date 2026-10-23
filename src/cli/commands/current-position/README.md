# `aico current-position`

The position you write from in this shell, as an e-mail's From line: `thread create`, `message send` and the task commands use it until `clear`, and `--as-position` chooses another one for a single message. As with `current-human`, its `set` and `clear` need AICo's shell function.

## Invariants

- Only a position you work can be selected, and a selected position you no longer work is refused rather than replaced.

## Decisions

- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the selected position.
