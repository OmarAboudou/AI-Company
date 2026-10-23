# Work

How the company's employees work: events in the journal give positions tasks, through listeners; whoever works a position does each task in a run, a fresh conversation with the message and tools its task's type builds; and a person works a task as a model does, turn by turn.

AICo's own task types and listeners are the tickets': each change of a ticket gives a task to the position that must act.

## Invariants

- Only `aico run` calls models: writing a message or working a task by hand never spends tokens.
- Listeners and task types return what is to be done, as data that AICo applies, and never write anything themselves; only tools act.
- A task has its cause's depth plus one, and a person's run adds nothing to it.
- The engine's operations are given the task types and listeners they know, AICo's own unless told otherwise: its tests run tasks of an example type, whatever AICo's own do.
- The user works their tasks as LLM employees do: the same system prompt, message and tools, and traces of the same form.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): employees work through tasks that events create, each run a fresh conversation with tools.
- [#135](https://github.com/OmarAboudou/AI-Company/issues/135): no built-in task type nor listener until the tickets bring theirs, no limit on chains of tasks, and the task types and listeners given to the engine.
