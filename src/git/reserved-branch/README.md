# Reserved branch

The reserved branch, `aico/data`, holds the company: AICo keeps its data there, apart from the project's code, so that the project's own branches carry only the project. AICo works on it in a worktree at `.aico/`, at the top of the project's working copy, which git leaves out of that working copy.

## Invariants

- `aico init` starts the branch without any history in common with the project's, and checks it out in `.aico/`, which it adds to the repository's `.git/info/exclude`: the project's working copy stays clean, and no file of the project names AICo.
- A clone is enough to find the company again: a command that finds no `.aico/` checks the branch out there, from the local branch or from the one remote that has it, which the local branch then tracks.
- The branch is checked out once: a command run from another working copy of the repository is told where the company is, and a branch found on several remotes waits for the person to choose one.
- `.aico/` is the company's folder only as the worktree of `aico/data`: `aico init` refuses to take over any other `.aico/` folder, and no command replaces one.

## Decisions

- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): the reserved branch and its worktree.
