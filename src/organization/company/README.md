# Company

The company is what AICo runs, one per project: its name and description, and its director's position.

`aico init` creates it in a git repository, with the director's position, management's, held by no employee: every person working on the repository is a director, whom git names, and writes from it.

## Invariants

- Every other operation first requires a company, and asks for `aico init` without one.
- The company exists once its configuration is written, which `aico init` does last: an interrupted `init` can run again.
- The company always names its director's position, which can be renamed, the company following it, but never deleted.
- The company can be updated, never deleted, since AICo would have nothing left to work on: removing its folder by hand does that.

## Decisions

- [#41](https://github.com/OmarAboudou/AI-Company/issues/41): the company can be updated, not deleted.
- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): the company names its director's position, and lives in a git repository.
