# LLM provider

An LLM provider serves models through an API: Anthropic's API, Amazon Bedrock, OpenRouter, a local Ollama server. It is the agency through which the company hires someone with a given profile; a local server is hiring in-house.

A provider is reached through its connections, one per API protocol it speaks, which all share its API key.

## Invariants

- The configuration says where to read the provider's API key, an environment variable or a file, never the key itself, which stays out of the company's files and of git.
- A key file inside the repository must be ignored by git: llmco refuses one that isn't.
- llmco hands the API the key it read from the provider, or explicitly none: it never lets an SDK look for credentials on its own, so that a key meant for one provider never reaches another.
- Deleting a provider deletes its models, which `--force` must confirm, and is refused while an employee runs on one of them, even with `--force`.
- Renaming a provider rewrites the employees that run on its models. An interrupted renaming leaves the provider twice at worst, never an employee running on a missing one.

## Decisions

- [#35](https://github.com/OmarAboudou/LLM-Company/issues/35): providers, and the models declared inside them.
- [#41](https://github.com/OmarAboudou/LLM-Company/issues/41): updating, renaming and deleting a provider.
- [#55](https://github.com/OmarAboudou/LLM-Company/issues/55): connections, and API keys read from the environment or a file.
