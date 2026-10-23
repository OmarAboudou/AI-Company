# Ticket

A ticket is a request from one position, its requester, to another, its assignee: a title and the request itself, in Markdown. A position that works for itself addresses a ticket to itself, being then both its requester and its assignee.

## Invariants

- A ticket is never modified once written: it freezes its positions' titles and its author's name as they were.
- Tickets are numbered in sequence, #1, #2…, each after the highest, by operations that never overlap: two tickets never get the same number, and a ticket whose creation stopped halfway keeps its own.
- A ticket's creation is recorded in the journal once the ticket is written.

## Decisions

- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): tickets numbered in sequence, under the operations' lock.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): a ticket is a request from one position to another.
