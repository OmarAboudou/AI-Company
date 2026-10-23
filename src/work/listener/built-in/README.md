# Built-in listeners

The listeners AICo ships with: those of the tickets' lifecycle, of the pause, and of the director's What now?, which the company's creation gives and each one's end gives again, at the end of the director's queue. Each act on a ticket gives a task to the position that now has the hand: its creation gives its assignee Handle, a question gives its requester Answer, an answer or a refused delivery gives its assignee Resume, a delivery gives its requester Validate, a renouncement gives the director Analyse the renouncement, giving it back gives its assignee Resume, and a hand-over gives the new assignee Handle. A session that ends without passing the hand gives the position that still has it its task again: Resume for the assignee, Answer or Validate for the requester, Analyse the renouncement for the director. Closing a ticket cancels the tasks queued for it. A failed task, which pauses the company, gives the director Analyse the failure; at the relaunch, the position that has the hand of its ticket gets its task again, unless the ticket was closed or that position already has a task on it.

## Invariants

- A task goes to the position that holds the role now, as the ticket's state names it.
- A closed ticket gives no task.

## Decisions

- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): each change of a ticket gives a task to the position that must act, closing a ticket cancels its queued tasks, a failed task gives the founder Analyse the failure, and the relaunch gives Resume.
