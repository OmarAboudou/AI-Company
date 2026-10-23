# Reserved branch

The reserved branch, `aico/data`, holds the company: AICo keeps its data there, apart from the project's code, so that the project's own branches carry only the project. AICo works on it in a worktree at `.aico/`, which git leaves out of the project's working copy.

## Invariants

- `aico init` starts the branch without any history in common with the project's, and checks it out in `.aico/`, which it adds to the repository's `.git/info/exclude`: the project's working copy stays clean, and no file of the project names AICo.
- `.aico/` is the company's folder only as the worktree of `aico/data`: `aico init` refuses to take over any other `.aico/` folder.

## Decisions

- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): the reserved branch and its worktree.
