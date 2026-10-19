# AGENTS.md

## Language

Everything written into the repository or on GitHub is in English: code, comments, test names, commit messages, pull requests, issues.

## Workflow

- GitHub Flow: never commit to `main`. One branch per coherent change (`feat/…`, `fix/…`, `chore/…`, `docs/…`), opened as a pull request against `main`.
- The maintainer reviews line by line: keep pull requests small, split into small commits that each make sense on their own.
- Answer review comments in their GitHub thread. Resolve a thread only when the maintainer's own last message in it settles it (an agreement, a decision, a thanks); while your reply is the last word, leave it open for the maintainer.
- Once the maintainer has approved a pull request, its checks pass and every review thread is resolved, the agent that opened it merges it with rebase-merge, unless the maintainer asked to wait. A commit pushed after the approval needs a new approval.
- A pre-push hook runs lint, typecheck and tests: never bypass it with `--no-verify`.
- A commit that only moves or renames code says so in its message and changes nothing else. Once it is on `main`, the agent that merged it adds its hash to `.git-blame-ignore-revs`, so that `git blame` skips it.

## Comments

Only for a non-obvious *why* that no test can carry (a workaround, an external constraint). No comments that paraphrase the code, explain a library, or mention file paths: they go stale silently. Express guarantees as tests instead.

## Naming

A name says what its value is, so that code reads at first sight, and says it from where it is read:

- **In its context**, a local or a parameter of a function `F` reads as "the x that `F` needs", a field of a type `T` as "the x of a `T`". The name doesn't repeat what the context says (`position.title`, not `position.positionTitle`), adds what the context doesn't (`threadMessages` in a function given a thread's id), and tells apart two values of one kind (`rawProviderId` and `rawModelId`).
- **Exported**, a name is read in the files that import it, without its folder: it names its concept (`loadThread`, not `load`).
- **Functions** start with a verb saying what they do:
  - `load`, `list`, `save`, `delete`: read or write the disk, for one item, all the items of a kind, writing, removing;
  - `get`: compute a value from data already in memory;
  - `read`: read what comes from outside llmco, such as git or environment variables;
  - `require`: check, and throw when the check fails;
  - `is`, `has`, `can`: answer yes or no;
  - `format`, `build`: produce a text;
  - `parse`: decode an input;
  - `create`: make a new value.
- **Booleans** read as assertions: `isConfirmed`, `hasTemporaryAssignment`, `shouldReplace`. An option read from the command line is renamed where it is destructured: `{ replace: shouldReplace }`.
- **Texts** say they are texts: `assignedMessage`, `refusalMessage`.
- **Collections** are plural and say what they hold: `filledPositions`, `keptPositionIds`.
- **What an operation returns**, beyond the entity it saves, has a type named after the operation: `deletePosition` returns a `DeletePositionResult`.
- No articles (`getAwaitedPositionIds`, not `getTheAwaitedPositionIds`), and no vague names such as `data`, `info`, `back` or `done`.

## Where knowledge lives

- **Where code goes**: the rules in [docs/architecture.md](docs/architecture.md). Read them before adding, moving or splitting a file.
- **Ideas for later**: GitHub issues labelled `idea` (`gh issue list --label idea`). Check them before designing a new concept; record new ones there instead of implementing them.
- **Structural decisions** (data model, `.llmco/` layout, concepts): GitHub issues labelled `decision`, closed by the pull request that implements them (`gh issue list --label decision --state all`). Read them before changing what they cover.
- **Smaller decisions**: commit messages and pull request descriptions (`git log`, `git blame`).

## Posting on GitHub

Every commit and every GitHub message written by an agent names the model that wrote it: a `Co-Authored-By: <model> <email>` trailer in commits, a `— <model> (<tool>)` signature line at the end of messages.

Claude posts from its own collaborator account, `omar-aboudou-claude`. Any agent posting from the maintainer's account instead must start every comment, reply or issue with a line identifying itself, e.g.:

> 🤖 **Codex** — *written by Codex, posted from Omar's account.*
