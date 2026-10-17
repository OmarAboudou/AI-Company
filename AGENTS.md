# AGENTS.md

## Language

Everything written into the repository or on GitHub is in English: code, comments, test names, commit messages, pull requests, issues.

## Workflow

- GitHub Flow: never commit to `main`. One branch per coherent change (`feat/…`, `fix/…`, `chore/…`, `docs/…`), opened as a pull request against `main`.
- The maintainer reviews line by line: keep pull requests small, split into small commits that each make sense on their own.
- Answer review comments in their GitHub thread. Never resolve a thread yourself: the maintainer resolves it once satisfied.
- Once the maintainer has approved a pull request, its checks pass and every review thread is resolved, the agent that opened it merges it with rebase-merge, unless the maintainer asked to wait. A commit pushed after the approval needs a new approval.
- A pre-push hook runs lint, typecheck and tests: never bypass it with `--no-verify`.

## Comments

Only for a non-obvious *why* that no test can carry (a workaround, an external constraint). No comments that paraphrase the code, explain a library, or mention file paths: they go stale silently. Express guarantees as tests instead.

## Where knowledge lives

- **Ideas for later**: GitHub issues labelled `idea` (`gh issue list --label idea`). Check them before designing a new concept; record new ones there instead of implementing them.
- **Structural decisions** (data model, `.llmco/` layout, concepts): GitHub issues labelled `decision`, closed by the pull request that implements them (`gh issue list --label decision --state all`). Read them before changing what they cover.
- **Smaller decisions**: commit messages and pull request descriptions (`git log`, `git blame`).

## Posting on GitHub

Every commit and every GitHub message written by an agent names the model that wrote it: a `Co-Authored-By: <model> <email>` trailer in commits, a `— <model> (<tool>)` signature line at the end of messages.

Claude posts from its own collaborator account, `omar-aboudou-claude`. Any agent posting from the maintainer's account instead must start every comment, reply or issue with a line identifying itself, e.g.:

> 🤖 **Codex** — *written by Codex, posted from Omar's account.*
