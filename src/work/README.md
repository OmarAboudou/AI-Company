# Work

How the company's employees work: events in the journal give positions tasks, through listeners; whoever works a position does each task in a run, a fresh conversation with the message and tools its task's type builds; and a person works a task as a model does, turn by turn.

AICo ships no task type nor listener yet, so that nothing gives a position a task: the engine's tests run tasks of an example type.

## Invariants

- Only `aico run` calls models: writing a message, creating a thread or working a task by hand never spends tokens.
- Listeners and task types return what is to be done, as data that AICo applies, and never write anything themselves; only tools act.
- A task has its cause's depth plus one, and a person's run adds nothing to it.
- People, directors and fictitious human employees alike, work their tasks as LLM employees do: the same system prompt, message and tools, and traces of the same form.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): employees work through tasks that events create, each run a fresh conversation with tools.
