# Message

A message is what a position writes in a thread: a body in Markdown, the position it was written from, the employee who wrote it, and the committer, the person at the keyboard according to git, as in a commit. A director's message has no employee: its committer is its author.

## Invariants

- A message is never modified once written: it freezes its position's title, its employee's name and its mentions as they were.
- Mentions are read from the body when the message is written. A mention counts outside code spans and blocks and outside e-mail addresses, for an existing position other than the author's; the author is told about a mention naming no position. Mentioning a specific employee, `@<position-id>:<employee-id>`, is refused for now.
- Each message is dated after the last one of its thread, and its id, its time followed by a random suffix, sorts with them: two machines adding messages to a thread never conflict.
- Each message records `message-sent` in the journal before it is written: an interrupted sending leaves at worst an event naming no message, never a message that the listeners never hear of.
- Writing a message needs git's `user.name` and `user.email`, which name its committer.

## Decisions

- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): immutable messages, mentions, authors and committers.
- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): the `message-sent` event.
