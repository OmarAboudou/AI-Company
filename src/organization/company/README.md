# Company

The company is what AICo runs, one per repository: its name and its director's position. The project it carries out has a description of its own.

`aico init` creates it in a git repository, on the reserved branch, with the director's position, management's, held by no employee: every person working on the repository is a director, whom git names, and writes from it.

## Invariants

- Every other operation first requires a company, which it opens from the reserved branch when `.aico/` is missing, as after a clone, and asks for `aico init` without one.
- The company exists once its configuration is written, which `aico init` does last: an interrupted `init` can run again.
- The company's creation is recorded in the journal, which gives the director their first task, What now?.
- The company always names its director's position, which can be renamed, the company following it, but never deleted.
- The company can be updated, never deleted, since AICo would have nothing left to work on: removing its folder by hand does that.

## Decisions

- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): the company can be updated, not deleted.
- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the company names its director's position, and lives in a git repository.
- [#135](https://github.com/OmarAboudou/AI-Company/issues/135): no limit on how deep a chain of tasks grows.
- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): the company on its reserved branch, and the project's description in place of the company's.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): the founder's recurring What now?.
