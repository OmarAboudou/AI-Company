# Architecture

The rules that decide where code goes and how big it grows. They never list the files: the tree shows them.

The code is being reorganized to follow these rules (#86).

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
- A folder holds at most 10 source entries, files and subfolders, not counting tests nor the file named after the folder. Beyond that, the files of one subject, which share an invariant or change together, merge into a file named after the subject.
- A file holds at most 300 lines. Beyond that, it splits by subject, into a subfolder if its folder would then hold more than 10 entries.
- A function may thus move from its own file into its subject's file as its folder grows. Such a move is a commit of its own, changing nothing else.

## Tests

- A file's tests sit next to it, in a file of the same name: `delete.ts` and `delete.test.ts`.
- An operation's rules are tested by calling the operation. A command keeps a few end-to-end tests of its arguments, its output and its exit code.

## Boundaries

- Only `src/cli/` imports commander, and nothing outside `src/cli/` imports from it.
- The core receives the project's root as a parameter: only `src/cli/` knows the current directory.
- No module imports a module that imports it back, directly or not.
