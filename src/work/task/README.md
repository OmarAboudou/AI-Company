# Task

A task is a piece of work for a position: its type, its parameters, the position it is for, and the event that caused it, such as a message. Whoever works the position does it: an LLM employee in `aico run`, a person through the task commands; a vacant position's tasks wait until someone works it.

A task's state is derived from the journal: queued once created, running once a run of it starts, then done or failed; it is cancelled instead once it became pointless. Tasks form a flat list, in which a task of a tree names its parent, as GitHub's sub-issues are ordinary issues linked to a parent.

## Invariants

- A task is written once and never modified: what happens to it is recorded in the journal.
- A task's id comes from what it is, its cause, type, position and parameters: two processes or two machines asking for the same task write the same file, and the second write is skipped.
- A task stores its type and parameters, never a ready-made message: its type builds what its run is given when it runs, from the company as it is then.
- A task names its position as it was called when the task was asked for, and follows it through renamings, by the position's id history.
- A task's depth is its cause's plus one.
- A task concerns a ticket when its parameters name it as `ticketNumber`: deleting a position relies on it.
- A position has at most one queued task per ticket: a change of the ticket gives no second one of the same type to a position whose task on it still waits, since that task will show the ticket as it is when it runs, and replaces one of another type, asked for what the ticket no longer needs.
- A person's next task is the one in progress in their positions, if any, else the oldest pending one, only in the selected position when one is set.
- During a pause of the company, a task that hasn't started waits, unless it is the director's.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): tasks, their states derived from the journal, and their ids derived from what they are.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): one queued task per ticket and position, and no new task during a pause but the founder's.
