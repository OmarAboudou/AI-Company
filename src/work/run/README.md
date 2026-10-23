# Run

A run is one attempt at a task: a fresh conversation in which whoever works the task's position does it. It starts with a system prompt, saying who the worker is, in which company and position, then the message and tools the task's type built; each turn of the worker is applied, its texts joining the discussion of the task's ticket and its tool calls running, in their order, their results given back, until the session ends: at an act that passes the hand on the ticket, or at a turn without any tool call. A model's run goes on by itself in `aico run`; a person's moves one turn at a time.

## Invariants

- Nothing is carried from one run to the next: each starts afresh, from what its task's message shows and its tools read.
- The system prompt is built once per run and never changes during it; it holds only what the worker must be told.
- A turn without any tool call ends the session, the task done without passing the hand. Going beyond 50 tool calls, a model's turn cut at its maximum length or by its context window, a refusal of its provider and an error of its API fail the task.
- A run's transcript, everything it was given and answered, stays on the machine that ran it, out of git; the journal records the run's start and end, the tokens it used and the messages it sent.
- Each tool call is committed on its own, named after the tool and the task; starting and ending the task are committed under the name of the command that runs it, such as `aico run`.
- A run whose task became pointless stops at its next step, checked before each tool call and each call of the model, and ends cancelled: the calls left in its turn don't run, and a person's run left in the middle ends rather than resumes.
- `aico run` runs the ready tasks one at a time, oldest first. A task that fails pauses the company, so that the next ones don't fail for the same reason, and doesn't run again. Stopping `aico run` fails the task in progress, its model's call cut short.
- A task serves once: no new run takes up a task left running. A model's run cut short, by a crash or a second Ctrl+C, fails its task at the next `aico run` on its machine, which tells it from a run still going by the process its transcript names. A person resumes their own run on the machine that started it.
- What a person's run causes keeps the depth of its task's cause: a person adds no link to a chain of tasks.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): runs as fresh conversations with tools, and transcripts kept on their machine.
- [#137](https://github.com/OmarAboudou/AI-Company/issues/137): a session ends at an act that passes the hand, or when its worker stops, and its texts join the ticket's discussion.
- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): a commit for each tool call, and transcripts still kept on their machine.
