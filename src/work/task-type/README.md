# Task type

A task type defines a kind of task: the parameters its tasks take, the result they produce, and, each time one of them runs, the situation its run is given, a message and tools, built from the parameters and a read-only view of the company. It can also find a task pointless, which cancels it: before it starts, or at its next step once it runs.

Listeners create tasks through their type, which checks their parameters, and a task's result is checked by its type when the task is done.

## Invariants

- A task type writes nothing: it returns what its run is given, or the task's result, which AICo records.
- A task's message is built when the task runs, never stored with it, so that it shows the company as it is then, not when the task was created.
- A task type can fix some inputs of its tools, such as the ticket its task concerns: they leave what the model or the person fills in, and come back when the call runs.
- A task of a type this version of AICo doesn't know, written by a newer one, waits; running it asks to update AICo.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): task types, their results, and the inputs they fix in their tools.
