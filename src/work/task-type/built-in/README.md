# Built-in task types

The task types AICo ships with, which its upgrades reach, where copies in each company would stay behind: those of the tickets, one for each move of a ticket's lifecycle: Handle, Resume, Answer, Validate, and the director's Analyse the renouncement; and the director's Analyse the failure, which a failed task gives, on a ticket or not, and What now?, the director's recurring task.

A ticket's task gives the position its situation: the request, the messages of the discussion that arrived since its last session on the ticket, and what is expected of it, with the tools of its acts and `ticket_show`, fixed to the ticket.

## Invariants

- A ticket's task shows the ticket as it is when it runs, not when it was created.
- A ticket's task is its position's while the ticket waits for it, its position having the hand in the state its type is for: once the ticket is closed, or the hand moved on, by a hand-over for one, the task becomes pointless. Queued, it is cancelled; running, it stops at its next step.
- A position's first session on a ticket gets the whole discussion; a later one gets the messages since its last session began, and reads the earlier ones with `ticket_show`.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): built-in task types live in AICo.
- [#135](https://github.com/OmarAboudou/AI-Company/issues/135): no built-in task type until the tickets bring theirs.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): the tickets' task types, and what a session sees of a discussion.
