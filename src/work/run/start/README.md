# Starting a run

How a run starts: its task's type builds the session, or finds the task done or pointless, then the run's transcript begins with what the worker is given, a system prompt saying who it is, in which company and position, the task's message and its tools.

## Invariants

- The system prompt is built once per run and holds only what the worker must be told: the same position gets the same one from a run to the next.
- A person's run starts as a model's does, with the same system prompt, message and tools.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): runs as fresh conversations with tools, and people working their tasks as models do.
