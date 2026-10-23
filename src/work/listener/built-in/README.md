# Built-in listeners

The listeners AICo ships with: those of the tickets' lifecycle. Each act on a ticket gives a task to the position that now has the hand: its creation gives its assignee Handle, a question gives its requester Answer, an answer or a refused delivery gives its assignee Resume, and a delivery gives its requester Validate. Closing a ticket cancels the tasks queued for it.

## Invariants

- A task goes to the position that holds the role now, as the ticket's state names it.
- A closed ticket gives no task.

## Decisions

- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): each change of a ticket gives a task to the position that must act, and closing a ticket cancels its queued tasks.
