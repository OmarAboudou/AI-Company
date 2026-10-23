# Message

A message is what a position writes in a ticket's discussion: a body in Markdown, the position it was written from, the employee who wrote it, and the committer, the person at the keyboard according to git, as in a commit. A message the user writes has no employee: its committer is its author.

## Invariants

- A message is never modified once written: it freezes its position's title and its employee's name as they were.
- Each message is dated after the last one of its discussion, and its id, its time followed by a random suffix, sorts with them: two machines adding messages to a discussion never conflict.
- Each message records `message-sent` in the journal before it is written: an interrupted sending leaves at worst an event naming no message, never a message that the listeners never hear of.
- Writing a message needs git's `user.name` and `user.email`, which name its committer.

## Decisions

- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): immutable messages, authors and committers.
- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): the `message-sent` event.
- [#135](https://github.com/OmarAboudou/AI-Company/issues/135): messages mention no position.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): messages belong to a ticket's discussion.
