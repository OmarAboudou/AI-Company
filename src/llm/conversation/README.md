# Conversation

A conversation is what a run exchanges with whoever works its task, in llmco's own form rather than a protocol's: a system prompt, tools, and turns. llmco gives the user turns, the task's message, the results of tool calls and reminders; whoever works the task, a model or a person alike, takes the assistant turns, texts and tool calls in their order.

## Invariants

- A model's turn keeps its provider's raw response, untouched, with the tokens it used and why it stopped: the next requests of its run replay the turn from it, signed reasoning included. Any other turn is replayed from llmco's own blocks.
- A person's turn has the same form as a model's, without a raw response, so that a person's trace and a model's compare.
- A tool call keeps its input as it was written: the tool checks it when the call runs, so that a malformed call gets what to fix rather than being lost.

## Decisions

- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): runs as fresh conversations, kept in llmco's own blocks, each model turn with its raw response.
