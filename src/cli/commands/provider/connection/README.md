# `llmco provider connection`

How providers are reached: one connection per API protocol, designated by its provider and its protocol, as in `llmco provider connection update ollama anthropic-messages`. It sits under `provider`, as `gh repo deploy-key` sits under `gh repo`: a connection is part of its provider's configuration, which only its models refer to. Its protocol being its id, it has no `update-id`.

## Decisions

- [#55](https://github.com/OmarAboudou/LLM-Company/issues/55): connections, nested in their provider.
