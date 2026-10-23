# Run

A run is one attempt at a task: a fresh conversation in which whoever works the task's position does it. It starts with a system prompt, saying who the worker is, in which company and position, then the message and tools the task's type built; each turn of the worker is applied, its tool calls run in order and their results given back, until a tool ends the task. A model's run goes on by itself in `aico run`; a person's moves one turn at a time.

## Invariants

- Nothing is carried from one run to the next: each starts afresh, from what its task's message shows and its tools read.
- The system prompt is built once per run and never changes during it; it holds only what the worker must be told.
- Every run can end its task: `task_mark-as-done` and `task_mark-as-failed` are given whatever its type's tools.
- A turn without any tool call gets a reminder, and a second one fails the task, as do going beyond 50 tool calls, a model's turn cut at its maximum length or by its context window, and a refusal of its provider.
- A run's transcript, everything it was given and answered, stays on the machine that ran it, out of git; the journal records the run's start and end, the tokens it used and the messages it sent.
- Each tool call is committed on its own, named after the tool and the task; starting and ending the task are committed under the name of the command that runs it, such as `aico run`.
- A run whose task became pointless stops at its next step, checked before each tool call and each call of the model, and ends cancelled: the calls left in its turn don't run, and a person's run left in the middle ends rather than resumes.
- An interrupted run records no end: its task stays running, and the next `aico run` takes it up in a new run. A person resumes their own run on the machine that started it.
- What a person's run causes keeps the depth of its task's cause: a person adds no link to a chain of tasks.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): runs as fresh conversations with tools, the reminder, and transcripts kept on their machine.
- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): a commit for each tool call, and transcripts still kept on their machine.
