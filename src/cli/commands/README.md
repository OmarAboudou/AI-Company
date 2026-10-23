# Commands

Every command of AICo, grouped by the concept it acts on: `aico <concept> <verb> <ids>`, as git groups its commands (`git remote set-branches origin main`). `aico init` and `aico run` act on no single concept, and stand alone.

## Invariants

- The verbs are the same across groups, `create`, `list`, `show`, `update`, `update-id` and `delete`, and the company's own words are their aliases, such as `employee hire` and `position close`.
- A kind that decides which options exist comes first, as a subcommand: `employee create llm`.
- `update` takes the options of `create`, all optional, and changes only those given; an id changes only through `update-id`.
- Nothing is replaced without `--replace`, and a deletion that changes other entities needs `--force`; one that would leave a broken reference is refused even with it.
- Every option in the help has a short and a long form, and every long input, such as a description or a message's body, can be read from a file instead, or from stdin, with `-F`.

## Decisions

- [#24](https://github.com/OmarAboudou/AI-Company/issues/24): the kind as a subcommand, short and long options, and `--replace`.
- [#35](https://github.com/OmarAboudou/AI-Company/issues/35): `<concept> <verb> <ids>`, rather than a command taking an argument then a subcommand.
- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): `update`, `update-id`, `--force`, and the company's words as aliases.
- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): every Markdown input can be read from a file.
- [#86](https://github.com/OmarAboudou/AI-Company/issues/86): the commands are laid out as the command line is.
