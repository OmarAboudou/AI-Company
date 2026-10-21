# The anthropic-messages protocol

The adapter of `anthropic-messages`, Anthropic's Messages API: it turns a run's conversation into a request, streams the model's answer as it comes, and turns the response back into a turn of the conversation. Anthropic's API speaks this protocol, and so do Ollama, LM Studio, llama.cpp and OpenRouter: it is the only one llmco calls for now.

## Invariants

- A turn this protocol produced is replayed exactly from its raw response, thinking blocks and their signatures included; any other turn from its texts and tool calls.
- Requests use the prompt cache, with two breakpoints: one after the tools and the system prompt, which every run of an employee in a position shares, and one at the end of the conversation, which each request of a tool loop extends.
- Without a key from the provider, a request carries none: the SDK never looks for credentials on the machine.
- A request allows at most 64,000 output tokens, which every current Claude model accepts, until settings give each model its own maximum.
- An error of the API is reported with the connection's address, and stops `llmco run` with the task still pending.
- Tests never call a real API: a fake server speaking the protocol answers them.

## Decisions

- [#55](https://github.com/OmarAboudou/LLM-Company/issues/55): an adapter per protocol, the official SDK, streaming, and the maximum of output tokens.
- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): the prompt cache, and a run's conversation translated by its protocol's adapter.
