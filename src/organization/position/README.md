# Position

A position is a job in the company: a title, and a job description that whoever holds it is given with each of its tasks. It outlives the employees who hold it, as a job does when someone leaves, and it is what tickets and tasks address, never a person.

A position has a single holder: an LLM employee, which works its tasks in `aico run`, or else the directors, the people working on the repository, who work them through the task commands. No position is ever vacant: a new position, or one an employee gives back, is held by the directors. The director's position, management's, is always held by the directors.

## Invariants

- A position names at most one employee, who exists: deleting the employee gives the position back to the directors, and renaming the employee rewrites the position.
- The director's position is never given to an employee, nor deleted.
- Renaming a position records its former id and when it changed, so that what was written under the former id, messages, tasks and events, still designates it. An interrupted renaming leaves the position twice at worst, never a reference to a missing one.
- A position's id can be reused: a reopened position is the same role, though the directors hold it at first.
- Deleting a position leaves its employee hired, and needs `--force` while the position has tasks pending on tickets, which then wait for a position that no longer exists.

## Decisions

- [#7](https://github.com/OmarAboudou/AI-Company/issues/7): a position is the job, separate from whoever fills it.
- [#24](https://github.com/OmarAboudou/AI-Company/issues/24): a position names its employee.
- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): updating, renaming and deleting a position.
- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the director's position and the id history.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): a position's holder is the user or an LLM employee, which replaces temporary assignments; no position is vacant. Handing a position over to another employee while one is unavailable is idea [#18](https://github.com/OmarAboudou/AI-Company/issues/18).
