# `llmco employee create`

Hiring an employee, alias `hire`: `llmco employee create llm` for an LLM employee, which needs a provider and one of its models, and `llmco employee create human` for a fictitious human employee. The kind comes first, as a subcommand, since it decides which options exist.

## Decisions

- [#24](https://github.com/OmarAboudou/LLM-Company/issues/24): an employee is an LLM or a human, its kind given as a subcommand.
