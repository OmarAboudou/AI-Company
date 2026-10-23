# Command line

The command line is AICo's interface, for people and scripts alike, and later for LLM employees: each command reads its arguments, calls the operation of the core named after it, and prints what the operation returns. The company's rules live in the core, which words its refusals in the command line's terms, such as "Add --force to delete it anyway", since the command line is how everyone acts on the company.

## Invariants

- A refusal prints its message alone and exits with 1; any other error is a bug, shown with its stack.
- Only the command line knows the current directory and reads the environment: it hands the project's root and the environment to the core.
- The commands that write the company's configuration run only for a director, and are refused to a fictitious human employee. Reading, writing in threads and working tasks are open to everyone.
- No command but the interactive session of `aico task work` asks a question: a refusal says what to add, such as `--force` or `--replace`, so that a person, a script and an LLM act the same way.

## Decisions

- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): refusals saying what `--force` would do, rather than confirmations.
- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the commands that write the configuration are reserved to directors.
- [#86](https://github.com/OmarAboudou/AI-Company/issues/86): a command calls an operation of the core, which refuses in the command line's words.
