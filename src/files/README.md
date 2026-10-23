# Files

How AICo reads and writes the files of the company's folder: JSON checked against a schema, Markdown texts, and listings in order. It tells apart what git versions, the company itself, from the local state, which stays on one machine.

## Invariants

- Every file read is checked: a missing file, invalid JSON or a mismatch with its schema is reported with its path in the project, as an error the person can fix.
- A file meant to be written once, such as an event or a task, is created only if it doesn't exist yet: a second write is refused, never an overwrite.
- The local state ignores itself: AICo writes its `.gitignore`, which ignores everything, before any state file, so that no state can reach a commit.
- Listings come sorted by name, which ids ordered by time turn into the order things happened.

## Decisions

- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the local state ignores itself, as pytest's cache does.
- [#86](https://github.com/OmarAboudou/AI-Company/issues/86): what several domains use sits at the root of the code, named after what it does.
