# Git

How llmco uses git: a company lives in a git repository, which keeps its history, and the person at the keyboard is who git says, as in a commit.

## Invariants

- llmco works only inside a git repository: `aico init` refuses to run elsewhere.
- A message's committer is git's `user.name` and `user.email`, without which no message is written.
- git runs on the folder llmco works on, whatever repository the variables llmco inherits name, such as the `GIT_DIR` that git hands its hooks.
- Without git installed, llmco says so rather than failing.

## Decisions

- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): git is required, and messages record their committer.
- [#86](https://github.com/OmarAboudou/LLM-Company/issues/86): what several domains use sits at the root of the code, named after what it does.
