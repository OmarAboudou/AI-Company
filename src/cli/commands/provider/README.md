# `llmco provider`

Declaring the LLM providers the models come from, and where their API key is read: an environment variable, with `-e, --api-key-env`, or a file, with `-k, --api-key-file`, never the key itself. How a provider is reached is the group of its connections, nested in this one, since a connection is part of its provider's configuration.

## Decisions

- [#35](https://github.com/OmarAboudou/LLM-Company/issues/35): providers, and the models declared inside them.
- [#41](https://github.com/OmarAboudou/LLM-Company/issues/41): `update`, `update-id`, and `delete`, with `--force` for its models.
- [#55](https://github.com/OmarAboudou/LLM-Company/issues/55): API keys read from the environment or a file, and connections.
