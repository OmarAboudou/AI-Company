# Employee

An employee is whoever holds positions besides the people: an LLM, running on a model of a provider. Choosing a model is hiring someone: several employees can run on the same model, each a person of its own, told apart by its name.

The people working on the repository are no employees: they are the directors, whom git names, and they hold every position no employee holds.

## Invariants

- An employee's model exists at its provider: deleting the model or the provider is refused while an employee runs on it.
- An employee can hold several positions at once, as an LLM can work in several places at once: the positions name it, it names none.
- An employee id once used, in a ticket or as a former id, isn't given to another employee without `--reuse-id`: an employee is a person, and the archives would name two people the same way.
- Renaming an employee records its former id and when it changed, so that what it wrote under the former id still designates it, and rewrites the positions it holds. An interrupted renaming leaves the employee twice at worst, never a position naming a missing one.
- Deleting an employee that holds positions needs `--force`, which gives its positions back to the directors.

## Decisions

- [#24](https://github.com/OmarAboudou/AI-Company/issues/24): employees, whom the positions name.
- [#35](https://github.com/OmarAboudou/AI-Company/issues/35): an LLM employee runs on a model declared inside its provider.
- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): updating, renaming, handing over and deleting an employee.
- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the id history and `--reuse-id`.
- [#135](https://github.com/OmarAboudou/AI-Company/issues/135): employees are LLMs, the people working on the repository being the directors.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): a deleted employee's positions go back to the user.
