# LLMs

What AICo needs to call LLMs: the providers that serve models, the connections that reach them, the models themselves, the conversation of a run in AICo's own form, and an adapter for each API protocol, which translates that conversation.

AICo exploits each protocol's and each provider's specificities rather than normalizing them: a model's turn keeps its provider's raw response, and a model's settings will be written in its provider's own vocabulary.

## Decisions

- [#35](https://github.com/OmarAboudou/AI-Company/issues/35): models are declared inside their provider, and settings are passed through to its API.
- [#55](https://github.com/OmarAboudou/AI-Company/issues/55): providers are reached through one connection per API protocol, with API keys read from the environment or a file.
- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): a run's conversation is kept in AICo's own form, which an adapter per protocol translates.
