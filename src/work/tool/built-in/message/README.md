# Message tools

The tools that write in threads, as `llmco message send` does: `message_send` sends a message from the run's position, signed by the run's worker and the committer, with the command's mentions and refusals. Its result is the message's number in the thread, and a word about each mention that names no position.

## Invariants

- A message sent in a run names the run, and has the run's depth: the tasks its mentions give continue the chain.

## Decisions

- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): a message is posted through a tool, never taken from a run's final text.
