# `aico message`

Writing in threads: `aico message send` adds a message to a thread, from the position you write from. It only writes: the tasks its mentions create run in `aico run`, or wait for the people working those positions.

## Decisions

- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): messages, and the position they are written from.
- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): sending a message never runs a task.
