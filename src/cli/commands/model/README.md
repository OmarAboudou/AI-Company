# `aico model`

Declaring the models the providers serve. A model is designated by its provider, then by its own id, as in `aico model show anthropic claude-opus-5-5`, since it is declared inside its provider; `model` is still a group of its own, as employees designate models.

## Invariants

- `model create` always requires `-a, --api-id`: a model's id at its provider often differs from its id in AICo.
- `model create` lets `-p, --protocol` be left out only when the provider has a single connection.

## Decisions

- [#35](https://github.com/OmarAboudou/LLM-Company/issues/35): models declared inside their provider, and `<concept> <verb> <ids>`.
- [#41](https://github.com/OmarAboudou/LLM-Company/issues/41): `update`, `update-id` and `delete`.
- [#55](https://github.com/OmarAboudou/LLM-Company/issues/55): the protocol a model is called with.
