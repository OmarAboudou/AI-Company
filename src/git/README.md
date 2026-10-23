# Git

How AICo uses git: a company lives in a git repository, on a branch of its own, `aico/data`, which keeps its history, a commit for each operation, and the person at the keyboard is who git says, as in a commit.

## Invariants

- AICo works only inside a git repository: `aico init` refuses to run elsewhere.
- Every change of the company is committed, and every message signed, as git's `user.name` and `user.email`, without which AICo changes nothing.
- git runs on the folder AICo works on, whatever repository the variables AICo inherits name, such as the `GIT_DIR` that git hands its hooks.
- Without git installed, AICo says so rather than failing.

## Decisions

- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): git is required, and messages record their committer.
- [#86](https://github.com/OmarAboudou/AI-Company/issues/86): what several domains use sits at the root of the code, named after what it does.
- [#136](https://github.com/OmarAboudou/AI-Company/issues/136): the company on its reserved branch, with a commit for each operation.
