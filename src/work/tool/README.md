# Tool

A tool is what lets whoever works a task act: send a message, read a thread, end the task. A run is given its tools, each with a description and a schema of its input, which a model reads and a person fills in; a call runs once its input matches the schema, and its result is given back as a model gets it.

Unlike listeners and task types, a tool acts: it is given its run's task, position and worker; each call and its result go into the run's transcript, and its effects into the journal.

## Invariants

- Only tools act: what a worker writes outside them reaches no one.
- A refused or malformed call fails alone, its result saying what to fix, and the run goes on.
- A tool is named after the command line's command that does the same, where there is one, since the command line is AICo's interface for people and LLM employees alike: `message_send` after `aico message send`.
- A task type can fix some inputs of a tool: they leave its schema, its description says "this thread" rather than "a thread", and they come back when the call runs.

## Decisions

- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): tools, named after the command line, and the inputs task types fix.
