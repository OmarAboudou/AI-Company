# `aico task`

Working your tasks as LLM employees do: the same system prompt, message and tools, turn by turn. `aico task next` opens the next task of the positions you work, or shows the one in progress; `aico task work` is an interactive session over the same steps, which asks for each tool's inputs from its schema, long texts in your editor, and waits for your next task until Ctrl+C or Ctrl+D. Ending your session there, as a model does with a turn without any tool call, passes the hand to no one; leaving it in the middle, by Ctrl+C or Ctrl+D, keeps it running, to resume on the same machine.

## Invariants

- What you prepared stays in your turn when the session stops.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): people work their tasks as LLM employees do, by commands or in an interactive session.
- [#137](https://github.com/OmarAboudou/AI-Company/issues/137): a person ends their session in `task work`.
- [#138](https://github.com/OmarAboudou/AI-Company/issues/138): a person's session left in the middle resumes later.
