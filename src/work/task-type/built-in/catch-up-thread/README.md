# Catching up on a thread

A position mentioned in a thread gets a task to catch up on it: read what it hasn't read yet, answer in the thread if something is asked of it, then mark the task as done. Its run is given the thread's subject, creator and members, and its unread entries, word for word and numbered; its tools send a message in this thread and show its earlier entries.

A position's read marker in a thread is the last entry its catch-ups there have read, which the journal records as each of them is done.

## Invariants

- The read marker moves only once a catch-up is done: a run that fails after sending a message finds that message among the unread entries when the position tries again.
- A run has read the entries its message showed and the messages it sent right after them, never an entry written elsewhere during the run.
- A catch-up is done without calling anyone when an earlier task of the position already read its cause, when the message that asked was never written, or when nothing is unread.
- A person who writes in the thread from the position marks its pending catch-ups there as done.

## Decisions

- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): catching up on a thread, and the read marker kept in the journal.
