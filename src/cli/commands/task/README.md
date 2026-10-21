# `llmco task`

Working your tasks as LLM employees do: the same system prompt, message and tools, turn by turn. `llmco task next` opens the next task of the positions you work, or shows the one in progress; `llmco task work` is an interactive session over the same steps, which asks for each tool's inputs from its schema, long texts in your editor, and waits for your next task until Ctrl+C or Ctrl+D.

## Invariants

- The session warns before adding a message that mentions nobody, since it asks no one to act.
- What you prepared stays in your turn when the session stops.

## Decisions

- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): people work their tasks as LLM employees do, by commands or in an interactive session.
