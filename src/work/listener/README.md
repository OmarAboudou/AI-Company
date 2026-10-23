# Listener

A listener subscribes to one type of event and answers each event of that type with effects, as data that AICo applies: creating a task, or marking one as done. Dispatching hands the journal's new events to the listeners: once `message send` or `thread create` has written its message, before a person's next task is chosen, and at each turn of `aico run`.

The built-in listener answers each message: it gives every position the message mentions a task to catch up on the thread, and, for a person's message, marks as done the catch-ups its position had pending there, since writing in the thread means having read it.

## Invariants

- A listener never writes anything itself: its effects are plain values, which AICo applies.
- Applying an effect again changes nothing: a task is recognized by what it is, so dispatching an event again, after a crash or on another machine, creates no task twice, and marking as done a task no longer pending does nothing.
- Which events a machine has dispatched stays on that machine, out of git: another machine dispatches them again, and finds the tasks they created.
- A task asked beyond the company's maximum depth isn't created: the journal records, once, that the chain stopped there.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): listeners returning effects, and the dispatched events remembered on each machine.
