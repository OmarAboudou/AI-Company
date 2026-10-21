# Task type

A task type defines a kind of task: the parameters its tasks take, the result they produce, and, each time one of them runs, the situation its run is given, a message and tools, built from the parameters and a read-only view of the company. It can also find a task done without anyone working it, when nothing is left to do.

Listeners create tasks through their type, which checks their parameters, and a task's result is checked by its type when the task is done.

## Invariants

- A task type writes nothing: it returns what its run is given, or the task's result, which llmco records.
- A task's message is built when the task runs, never stored with it, so that it shows what is unread then, not when the task was created.
- A task type can fix some inputs of its tools, such as the thread a catch-up concerns: they leave what the model or the person fills in, and come back when the call runs.
- A task of a type this version of llmco doesn't know, written by a newer one, waits; running it asks to update llmco.

## Decisions

- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): task types, their results, and the inputs they fix in their tools.
