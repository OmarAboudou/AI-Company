# `llmco turn add`

Adding a block to your next turn: `turn add text`, a text, which reaches no one, as a model's text doesn't; `turn add tool <tool-name> -i <json>`, a tool call, checked against the tool's schema as soon as it is added.

## Decisions

- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): a person's turns, made of the same blocks as a model's.
