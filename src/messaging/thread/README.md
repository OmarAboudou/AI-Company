# Thread

A thread is a conversation between positions, as a post in a Discord forum is: a subject, its creator, and the entries written in it, messages for now, in the order they were written. It concerns several positions and outlives each of them, so it is stored once, apart from them.

Its members are derived: its creator, every position that wrote in it, and every position mentioned in it.

## Invariants

- Nothing in a thread is modified once written: its subject and its creator are frozen when it is created, the creator's position title and employee name as they were then.
- Its entries are numbered from 1, in the order they were written: tasks and tools show them by these numbers.
- A thread's id comes from its creation date and its subject, and is unique among threads.
- A thread keeps the ids it was written with: a renamed position is still recognized in it, through its id history.

## Decisions

- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): threads, their derived members, their immutability, and the id history.
- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): a thread's entries, which tasks catch up on.
