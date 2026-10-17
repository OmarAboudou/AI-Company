# AGENTS.md

## Language

Everything written into the repository or on GitHub is in English: code, comments, test names, commit messages, pull requests, issues.

## Workflow

- GitHub Flow: never commit to `main`. One branch per coherent change (`feat/…`, `fix/…`, `chore/…`, `docs/…`), opened as a pull request against `main`.
- The maintainer reviews line by line: keep pull requests small, split into small commits that each make sense on their own.
- Answer review comments in their GitHub thread. Merge only when the maintainer asks.
- A pre-push hook runs lint, typecheck and tests: never bypass it with `--no-verify`.

## Comments

Only for a non-obvious *why* that no test can carry (a workaround, an external constraint). No comments that paraphrase the code, explain a library, or mention file paths: they go stale silently. Express guarantees as tests instead.

## Where knowledge lives

- **Ideas for later**: GitHub issues labelled `idea` (`gh issue list --label idea`). Check them before designing a new concept; record new ones there instead of implementing them.
- **Structural decisions** (data model, `.llmco/` layout, concepts): GitHub issues labelled `decision`, closed by the pull request that implements them (`gh issue list --label decision --state all`). Read them before changing what they cover.
- **Smaller decisions**: commit messages and pull request descriptions (`git log`, `git blame`).

## Posting on GitHub

Messages are posted from the maintainer's account. Start every comment, reply or issue you write with a line identifying you, e.g.:

> 🤖 **Claude** — *written by Claude (Claude Code), posted from Omar's account.*
