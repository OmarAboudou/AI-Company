# Turn

A person's turn in a run, prepared as git's index prepares a commit: texts and tool calls are added one by one, shown or cleared, then sent together. Sending applies the turn as a model's: its calls run in order, their results come back as a model gets them, and a tool that ends the task ends it.

## Invariants

- The turn being prepared stays with its run on the machine, out of git, until it is sent.
- A tool call is checked against the tool's schema as soon as it is added.
- The turn is emptied before its calls run: a crash among them can't send the same turn, and its messages, twice.
- With runs in progress in several positions, the selected position says which one a turn goes to.
- A turn without any tool call gets the same reminder as a model's, and a second one fails the task.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): people work tasks as LLM employees do, their turns built like git's index.
