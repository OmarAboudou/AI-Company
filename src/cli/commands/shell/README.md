# `aico shell`

AICo's shell function, for bash and zsh, through which `current-human` and `current-position` change the shell's environment, since a program can't do that for the shell that started it. It also shows who is at the keyboard in the prompt, as `(julie @graphics)`, inside an AICo project only, as git's `__git_ps1` shows the branch only inside a repository. `aico shell init` prints it, for the shell's startup file to evaluate, as `pyenv init` does.

## Invariants

- AICo edits a startup file only when asked, with `--install`, and refuses one that already evaluates the function.
- `AICO_DISABLE_PROMPT` leaves the prompt as it is.

## Decisions

- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): the shell function and the prompt.
