# Command line

The command line is AICo's interface, for people and scripts alike, and later for LLM employees: each command reads its arguments, calls the operation of the core named after it, and prints what the operation returns. The company's rules live in the core, which words its refusals in the command line's terms, such as "Add --force to delete it anyway", since the command line is how everyone acts on the company.

## Invariants

- A refusal prints its message alone and exits with 1; any other error is a bug, shown with its stack.
- Only the command line knows the current directory and reads the environment: it hands the core the project's root, the top folder of the repository it runs in, and the environment.
- A command that changes the company runs its core operation as an operation of the reserved branch: one commit, named after the command, its subcommands and its arguments. A command that goes on, such as `aico run`, commits each of its steps under its name.
- No command but the interactive session of `aico task work` asks a question: a refusal says what to add, such as `--force` or `--replace`, so that a person, a script and an LLM act the same way.

## Decisions

- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): refusals saying what `--force` would do, rather than confirmations.
- [#86](https://github.com/OmarAboudou/AI-Company/issues/86): a command calls an operation of the core, which refuses in the command line's words.
- [#135](https://github.com/OmarAboudou/AI-Company/issues/135): no command reserved to directors, nobody else being at the keyboard.
- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): a commit for each command that changes the company.
