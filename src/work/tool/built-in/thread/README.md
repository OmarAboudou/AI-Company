# Thread tools

The tools that read threads, as `aico thread show` does: `thread_show` shows a thread's entries word for word, by their numbers, 20 at most per call, so that a long thread never floods a run. A catch-up's message already shows the entries its position hasn't read: this tool reads the earlier ones.

## Decisions

- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): threads stay readable word for word through tools.
