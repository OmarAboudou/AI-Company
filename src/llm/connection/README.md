# Connection

A connection is how a provider is reached through one API protocol: `anthropic-messages`, `openai-chat-completions` or `openai-responses`, named after their endpoints, since OpenAI has two. A provider has one connection per protocol it speaks, all sharing its API key, as the same agency can be reached by phone or by mail.

## Invariants

- A connection is part of its provider's configuration, and its protocol is its id: it is never renamed.
- Each connection has its own base URL, since the protocols of one server live at different addresses.
- How the key is sent, an `x-api-key` header or a bearer token, is a choice of `anthropic-messages` only: the OpenAI protocols always send a bearer token.
- A provider can exist without connections; a model is declared through one of them, and deleting a connection is refused while a model is called through it.

## Decisions

- [#55](https://github.com/OmarAboudou/LLM-Company/issues/55): one connection per API protocol.
