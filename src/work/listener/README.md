# Listener

A listener subscribes to one type of event and answers each event of that type with effects, as data that AICo applies: creating a task, marking one as done, or cancelling a queued one. Dispatching hands the journal's new events to the listeners: before a person's next task is chosen, and at each turn of `aico run`.

No listener is built in yet: no event gives a task.

## Invariants

- A listener never writes anything itself: its effects are plain values, which AICo applies.
- Applying an effect again changes nothing: a task is recognized by what it is, so dispatching an event again, after a crash or on another machine, creates no task twice, and marking as done a task no longer pending does nothing, nor does cancelling a task no longer queued.
- A listener cancels only queued tasks: a running task is left to its run, which ends what it runs.
- The journal records each dispatching, with the events it gave: a clone or another machine gives the listeners only the events recorded since. These records are no events to give.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): listeners returning effects, and the journal recording what was dispatched.
- [#135](https://github.com/OmarAboudou/AI-Company/issues/135): no built-in listener until the tickets bring theirs.
- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): the events already dispatched, versioned in the journal.
