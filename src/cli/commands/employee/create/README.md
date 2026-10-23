# `aico employee create`

Hiring an employee, alias `hire`: `aico employee create llm` for an LLM employee, which needs a provider and one of its models. The kind comes first, as a subcommand, since it decides which options exist; LLMs are the only kind for now.

## Decisions

- [#24](https://github.com/OmarAboudou/AI-Company/issues/24): an employee's kind, given as a subcommand.
