# `aico thread`

Creating, listing and reading threads. `thread create` prints the new thread's id alone, for a script to capture; `thread list` and `thread show` tell which positions have a task pending in each thread; `thread show --json` prints one message per line, for `jq` and `tail`.

## Decisions

- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): threads, shown in Markdown or as JSON Lines.
- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): the positions with a task pending in a thread.
