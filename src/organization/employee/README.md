# Employee

An employee is whoever fills positions: an LLM, running on a model of a provider. Choosing a model is hiring someone: several employees can run on the same model, each a person of its own, told apart by its name.

The people working on the repository are no employees: they are the directors, whom git names, and they work the positions assigned to them temporarily.

## Invariants

- An employee's model exists at its provider: deleting the model or the provider is refused while an employee runs on it.
- An employee can fill several positions at once, as an LLM can work in several places at once: the positions name it, it names none.
- An employee id once used, in a thread or as a former id, isn't given to another employee without `--reuse-id`: an employee is a person, and the archives would name two people the same way. The id `director` is reserved for the directors.
- Renaming an employee records its former id and when it changed, so that what it wrote under the former id still designates it, and rewrites the positions it works. An interrupted renaming leaves the employee twice at worst, never a position naming a missing one.
- Deleting an employee that works positions needs `--force`, which leaves its positions vacant and ends its temporary assignments.

## Decisions

- [#24](https://github.com/OmarAboudou/AI-Company/issues/24): employees, whom the positions name.
- [#35](https://github.com/OmarAboudou/AI-Company/issues/35): an LLM employee runs on a model declared inside its provider.
- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): updating, renaming, handing over and deleting an employee.
- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the id history and `--reuse-id`.
