# Architecture

The rules that decide where code and documentation go, and how big they grow. They never list the files: the tree shows them.

`bun run lint` checks the boundaries, the import cycles and the length of files, and `bun run test` the length of folders.

## The command line mirrors the commands

- `llmco <group> <verb>` lives in `src/cli/commands/<group>/<verb>.ts`, named after the command's name, not its alias.
- A group is declared in `src/cli/commands/<group>/<group>.ts`, a nested group one folder down, and a command without group lives in `src/cli/commands/<verb>.ts`.
- `src/cli/program.ts` registers the groups, and `src/cli/main.ts` runs the program.
- What every command uses sits at the root of `src/cli/`.

## A command calls an operation of the core

- A command reads its arguments, calls the operation of the core named after it, and prints what the operation returns: `llmco position delete` calls `deletePosition`.
- The operation applies every rule, and throws each refusal with its message. The message says what to do in the command line's words, since the command line is llmco's interface for people and LLM employees alike.
- A command that only reads uses the core's reading functions, and formats their result.

## The core is grouped by domain, then by concept

- Outside `src/cli/`, code is grouped by domain, then by concept, with a folder for each.
- A concept's folder holds its format in `schema.ts`, the reading and writing of its files in `storage.ts`, and its operations and rules.
- A rule shared by several concepts lives with the entity it chooses, allows or refuses.
- What several domains use without belonging to any of them sits at the root of `src/`, named after what it does. Several such files sharing a subject get a folder named after that subject. No folder is named after who uses its files, such as `shared/`, `utils/`, `common/` or `helpers/`.

## Files are small, folders are short

- Code starts as one file per operation and per rule, named after the function it exports, with the small functions only it uses: `get-current-worker.ts` exports `getCurrentWorker`. A concept's `schema.ts` and `storage.ts` stay whole.
- A folder holds at most 15 source entries, files and subfolders, not counting tests nor the file named after the folder. Beyond that, the entries of one subject, which share an invariant or change together, are grouped: files merge into a file named after the subject, and subfolders, or files too long to merge, move into a subfolder named after it.
- In `src/cli/commands/`, whose folders mirror the commands, a folder beyond 15 entries means the command line itself has too many commands at that level: the commands are regrouped first, and their folders follow.
- A file holds at most 300 lines. Beyond that, it splits by subject, into a subfolder if its folder would then hold more than 15 entries.
- A function may thus move from its own file into its subject's file as its folder grows. Such a move is a commit of its own, changing nothing else.

## Tests

- A file's tests sit next to it, in a file of the same name: `delete.ts` and `delete.test.ts`.
- Code that only tests use, such as a fake API server or a temporary company, sits next to the code it helps test, in a file ending in `.testing.ts`. Production code never imports it, as `bun run lint` checks.
- An operation's rules are tested by calling the operation. A command keeps a few end-to-end tests of its arguments, its output and its exit code.

## Boundaries

- Only `src/cli/` imports commander, and nothing outside `src/cli/` imports from it.
- The core receives the project's root and the environment as parameters: only `src/cli/` knows the current directory and reads `process.env`, apart from `spawnGit`, which hands it to git.
- No module imports a module that imports it back, directly or not.

## Documentation

- Documents live in `docs/`, except `README.md` and `AGENTS.md`, which GitHub and coding agents look for at the root.
- A document holds what is read together, such as these rules, which apply to every change. Beyond 300 lines, it splits by topic. A document whose parts are read separately, such as one page per command group, is split from the start.
