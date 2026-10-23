# Message tools

The tools that write in tickets' discussions: `message_send` sends a message from the run's position, signed by the run's worker and the committer. Its result is the message's number in the discussion.

## Invariants

- A message sent in a run names the run, and has the run's depth.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): a message is posted through a tool, never taken from a run's final text.
