# LLM model

A model is a profile in its provider's catalog, declared inside the provider that serves it under the provider's own reference, its API id. What AICo calls is always a model at a provider, and what it accepts depends on both: the same model served by two providers is declared twice.

## Invariants

- A model's id is unique within its provider. Its API id, the one its provider's API expects, often differs from it, so it is asked for every time a model is declared.
- A model names the protocol it is called with, one of its provider's connections, and keeps it from one request to the next, since its settings will be written in that protocol's vocabulary. AICo fills it in when the provider has a single connection, but the configuration always states it.
- Deleting a model is refused while an employee runs on it. Renaming a model rewrites the employees that run on it; an interrupted renaming leaves the model twice at worst, never an employee running on a missing one.

## Decisions

- [#35](https://github.com/OmarAboudou/LLM-Company/issues/35): models are declared inside their provider.
- [#41](https://github.com/OmarAboudou/LLM-Company/issues/41): updating, renaming and deleting a model.
- [#55](https://github.com/OmarAboudou/LLM-Company/issues/55): a model names the protocol it is called with.
