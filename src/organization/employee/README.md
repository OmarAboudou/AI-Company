# Employee

An employee is whoever fills positions: an LLM, running on a model of a provider, or a human. Choosing a model is hiring someone: several employees can run on the same model, each a person of its own, told apart by its name.

A human employee is fictitious: a role that a real person takes on at the keyboard, a bundle of duties a person handles until an LLM can. The real people are the directors, whom git names.

## Invariants

- An employee's kind never changes: handing its positions over to another employee replaces an LLM by a human, or the other way round, and the employee stays hired, filling nothing.
- An LLM employee's model exists at its provider: deleting the model or the provider is refused while an employee runs on it.
- An employee can fill several positions at once, as an LLM can work in several places at once: the positions name it, it names none.
- An employee id once used, in a thread or as a former id, isn't given to another employee without `--reuse-id`: an employee is a person, and the archives would name two people the same way. The id `director` is reserved for the directors.
- Renaming an employee records its former id and when it changed, so that what it wrote under the former id still designates it, and rewrites the positions it works. An interrupted renaming leaves the employee twice at worst, never a position naming a missing one.
- Deleting an employee that works positions needs `--force`, which leaves its positions vacant and ends its temporary assignments.

## Decisions

- [#24](https://github.com/OmarAboudou/LLM-Company/issues/24): an employee is an LLM or a human, and the position names it.
- [#35](https://github.com/OmarAboudou/LLM-Company/issues/35): an LLM employee runs on a model declared inside its provider.
- [#41](https://github.com/OmarAboudou/LLM-Company/issues/41): updating, renaming, handing over and deleting an employee.
- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): human employees are fictitious, the id history and `--reuse-id`.
