# Task tools

The tools that end a task, given to every run whatever its type: `task_mark-as-done`, with a summary of what was done for whoever reviews it, and `task_mark-as-failed`, with the reason the task can't be done.

## Invariants

- The turn that calls one is the run's last: its other calls still run, in order, then the task ends as the first of these two tools called says, without the model being called again.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): a task ends explicitly, through `task_mark-as-done` or `task_mark-as-failed`.
