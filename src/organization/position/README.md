# Position

A position is a job in the company: a title, and a job description that whoever works it is given with each of its tasks. It outlives the employees who hold it, as a job does when someone leaves, and it is what threads and tasks address: `@backend-developer` mentions a position, never a person.

Whoever works a position is its default employee, unless it is assigned temporarily, to another employee or to the directors, the people working on the repository; with neither, the position is vacant, and its tasks wait. The director's position, management's, is always worked by the directors.

## Invariants

- A position has at most one default employee, who exists: deleting the employee leaves the position vacant, and renaming the employee rewrites the position.
- A temporary assignment stays on the machine that made it, out of git, and never names the default employee: assigning a position temporarily to its default employee writes nothing, and making the temporary assignee the default employee ends the temporary assignment.
- The director's position is never assigned, by default or temporarily, nor deleted.
- Renaming a position records its former id and when it changed, so that what was written under the former id, messages, tasks and events, still designates it. An interrupted renaming leaves the position twice at worst, never a reference to a missing one.
- A position's id can be reused: a reopened position is the same role, though it starts vacant.
- Deleting a position leaves its employee hired, and needs `--force` while the position has tasks pending in threads, which then wait for a position that no longer exists.

## Decisions

- [#7](https://github.com/OmarAboudou/LLM-Company/issues/7): a position is the job, separate from whoever fills it.
- [#24](https://github.com/OmarAboudou/LLM-Company/issues/24): a position names its default employee.
- [#41](https://github.com/OmarAboudou/LLM-Company/issues/41): updating, renaming and deleting a position.
- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): the director's position, temporary assignments and the id history.
