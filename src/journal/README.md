# Journal

The journal is the company's activity journal: one event for each thing that happened, a message sent, a task created, started, done or failed, kept in git with the rest of the company. The state of tasks, and a position's read marker in a thread, are derived from it rather than stored.

Each concept defines its own types of events, with their fields. The journal itself knows only what every event has: its type, when it happened, and its depth, how many tasks led to it, 0 for what a person does.

## Invariants

- An event is written once and never modified, in a file of its own named after its time and a random suffix: files that are only ever added never conflict between machines, and sort in the order things happened.
- Events recorded by one process within the same millisecond still sort in the order they were recorded.
- Recording an event checks every field of its type, while reading ignores the fields it doesn't know, at any depth: an event written by a newer llmco is kept and passed over, rather than stopping every reading of the journal. An event of a type llmco doesn't know is kept too.
- A command loads the journal once and adds to it the events it records; a command that goes on, such as `aico run` or `aico task work`, reads again what other processes recorded meanwhile.

## Decisions

- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): events and the journal, types of events defined by each concept, and depth.
