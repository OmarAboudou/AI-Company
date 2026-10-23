# AICo

Run a virtual company staffed by LLM agents, from the command line.

A company lives in its project's git repository, on a branch of its own, `aico/data`: the company itself, the project it carries out, its positions (job descriptions), its employees, run by LLMs, the LLM providers whose models they run on, its tickets, the requests its positions make to each other, their tasks, and the journal of what happens. Everything is a plain file, to edit through the CLI or by hand, and every change is a commit.

You, the person git names, are the founder: `aico init` creates the founder's position, the company's management, which you always hold, as you hold every position no LLM employee holds.

AICo is being rebuilt from llmco, as decided in [#135](https://github.com/OmarAboudou/AI-Company/issues/135): its first series renamed it and removed what the vision drops, such as mentions and fictitious human employees; the second moved its data to the reserved branch, as decided in [#136](https://github.com/OmarAboudou/AI-Company/issues/136); the third brought tickets, their tasks, the founder and the company's pause, as decided in [#145](https://github.com/OmarAboudou/AI-Company/issues/145). Deliverables in git, sessions with development tools, then memory and decisions come next, one series at a time: until then, a delivery is the text that describes it.

## Getting started

AICo runs on [Bun](https://bun.sh). From a clone of this repository:

```bash
bun install
bun link
```

Then, from any project under git:

```bash
aico init -n "Acme" -d "A to-do app for small teams."
aico position create backend-developer -t "Backend Developer" -d "You build the API."
aico provider create anthropic -n "Anthropic" -e ANTHROPIC_API_KEY
aico provider connection create anthropic anthropic-messages -u https://api.anthropic.com
aico model create anthropic claude-opus-5-5 -n "Claude Opus 5.5" -a claude-opus-5-5
aico employee hire llm claude-senior -n "Claude Senior" -p anthropic -m claude-opus-5-5
aico position assign backend-developer claude-senior
aico task work     # your What now?: ask @backend-developer for work with ticket_create, then end your session
aico run           # Claude Senior handles the ticket
```

`init`'s description is the project's, which every LLM employee is given; `aico project update` changes it. `aico --help` lists every command; each works from any folder of the repository, as git's do.

## Where the company lives

The company lives on its own branch, `aico/data`, which AICo creates without any history in common with your code: your branches carry only your project. AICo checks it out in `.aico/`, at the top of your working copy, and lists `.aico/` in `.git/info/exclude`, so that `git status` stays clean.

Each command that changes the company, and each tool call and text of a session, is a commit of its own on `aico/data`, named after it:

```bash
git -C .aico log --oneline
# 6f7a8b9 aico run
# 5e6f7a8 ticket_deliver in task 20261024-101500-123-4a5b-6c7d8e9f
# 4d5e6f7 text in task 20261024-101500-123-4a5b-6c7d8e9f
# 3c4d5e6 aico run
# 2b3c4d5 ticket_create in task 20261024-100000-456-7a8b-9c0d1e2f
# 1a2b3c4 aico task work
# 5a6b7c8 aico init
```

AICo commits as you, as git names you (`user.name` and `user.email`), and never pushes `aico/data`: publishing the company is yours to decide, since its tickets and its journal would become as public as your repository. Once you push it, with `git push origin aico/data`, a clone finds the company again: AICo checks the branch out at its first command. A file you edit by hand in `.aico/` is committed by the next command that changes the company, in a commit of its own.

What stays on your machine lives in `.aico/.state/`, which git ignores: each run's whole conversation, the turn you prepare, and the lock that keeps two commands from changing the company at once.

## Tickets

Positions ask each other for work through **tickets**: a request from one position, the requester, to another, the assignee, numbered in sequence (#1, #2…), with the discussion between the two. Only the founder creates tickets, in the What now? task that always comes back at the end of your queue; a position held by an LLM asks you its questions.

A ticket's state says who has the hand: open while the assignee works on it, waiting for the requester's answer to a question, to validate once delivered, to arbitrate by the founder once renounced, then closed, done, cancelled or failed. Each move is an act, made with a tool in a session: the assignee asks, delivers or renounces; the requester answers, validates or refuses the delivery, or cancels the ticket; the founder gives a renounced ticket back, hands a ticket over to another position, or closes it as failed. Each act gives a task to the position that now has the hand: Handle to a new assignee, Answer and Validate to the requester, Resume to the assignee. What a session writes outside its tools joins the discussion, passing the hand to no one.

```bash
aico ticket list                                      # number, state, requester → assignee, title
aico ticket show 3                                    # its request and discussion, in Markdown
aico ticket show 3 --json | jq -r .body               # one message per line
```

## Positions and their holders

Each position has a single holder: an LLM employee, who works its tasks in `aico run`, or you, who work them yourself. A new position is yours until you give it to an employee; the founder's is always yours.

```bash
aico position assign backend-developer claude-senior   # Claude Senior holds it
aico position unassign backend-developer               # you hold it again
aico employee fire claude-senior --force               # its positions come back to you
```

With several positions of yours, `aico current-position set <position-id>` works from one of them until `aico current-position clear`. These two commands change your shell's environment, which only AICo's shell function can do, set up once: `aico shell init <bash|zsh> --install` adds the line evaluating it to `~/.bashrc` or `~/.zshrc`; without `--install`, the command prints the function, for you to place where you prefer. In an AICo project, the function also shows the selected position in your prompt: `(aico)`, then `(aico @graphics)`. A script sets `AICO_CURRENT_POSITION_ID` itself, and `AICO_DISABLE_PROMPT` leaves the prompt as it is.

```bash
aico shell init bash --install         # once, then open a new terminal
aico current-position set graphics     # the prompt shows (aico @graphics)
aico current-position clear            # (aico)
```

## Running the company

`aico run` runs the pending tasks of the positions LLM employees hold, one at a time and oldest first, until none is ready; then it lists the tasks left waiting, such as yours (see [Working your tasks](#working-your-tasks)). Only `aico run` calls LLMs.

Each task is one session, a fresh conversation with the employee's model: who it is, the ticket's situation, the messages since its last session on the ticket, and the tools of its acts. The session ends at an act that passes the hand, or at a turn without any tool call, after which the position gets the ticket back in a task of its own. What a session does gives tasks in turn, which the same `aico run` runs.

A task that fails, on an error of a provider's API or a refusal of its model for one, pauses the company, so that the next ones don't fail for the same reason: a failed task doesn't run again. Ctrl+C stops `aico run`, failing the task in progress; a second one quits at once, and the next `aico run` fails the task left running.

Everything that happens is recorded in the journal, `.aico/journal/`, one file per event; tasks live in `.aico/tasks/`, and each run's whole conversation in `.aico/.state/runs/`.

```bash
aico run                                              # runs what is ready, then lists what waits
```

## The founder and the pause

The company pauses itself at a failed task or a renouncement, and you can pause it at any time. During a pause, the sessions already running finish, and no task starts but the founder's: you analyse what went wrong, in "Analyse the failure" or "Analyse the renouncement", readjust what was missing with AICo's commands, such as a position's description or its employee, and arbitrate a renounced ticket, giving it back, handing it over or closing it. Relaunching the company gives the tickets whose task failed back to the position that has their hand.

```bash
aico company pause
aico company show                                     # says since when the company is paused
aico company relaunch
```

## Working your tasks

You work your tasks as LLM employees do: the same message, the same tools, turn by turn, from the positions you hold, only the selected one's when one is set.

`aico task work` works them one after the other. It shows each task as a model gets it, its system prompt, its message and its tools, then asks what to do: call a tool, write a text, show, clear or send your turn, or end your session. For a tool, it asks which one, then each of its inputs, a long text in your editor (`$VISUAL` or `$EDITOR`). Sending the turn writes its texts in the ticket's discussion, runs its calls and shows their results; your session ends, as a model's does, at an act that passes the hand or at a turn without any tool call, and ending it passes the hand to no one. Ctrl+C, or Ctrl+D as in a shell, leaves `task work`: a session left in the middle resumes later, and what you prepared stays in your turn.

```bash
aico task work
```

The same steps are commands of their own, for a script or a turn prepared over time. Your next turn waits in `.aico/.state/`, as git's index holds a commit before it is made:

```bash
aico task next                                        # opens your next task, or the one in progress
aico turn add text -t "Checked the notes first."      # joins the ticket's discussion
aico turn add tool ticket_deliver -i '{"body": "Hono, for Bun."}'
aico turn show
aico turn clear                                       # to prepare the turn again
aico turn send                                        # writes its texts, runs its calls, then shows their results
```

## Connecting to LLM providers

A provider is reached through one **connection** per API protocol it speaks: `anthropic-messages` for now, `openai-chat-completions` and `openai-responses` later. Each model names the protocol it is called with.

Its API key is read from an environment variable (`-e, --api-key-env`) or a file (`-k, --api-key-file`), never written in `.aico/`. Bun loads a `.env` file from the current directory, so a key in a git-ignored `.env` works; a key file inside the repository must be ignored by git.

Ollama, LM Studio, llama.cpp and OpenRouter also speak Anthropic's Messages API:

```bash
aico provider create ollama -n "Ollama"
aico provider connection create ollama anthropic-messages -u http://localhost:11434
aico model create ollama llama-3-1-8b -n "Llama 3.1 8B" -a llama3.1:8b

aico provider create openrouter -n "OpenRouter" -e OPENROUTER_API_KEY
aico provider connection create openrouter anthropic-messages -u https://openrouter.ai/api -a bearer
```

## Editing config files by hand

Every `config.json` under `.aico/` has a JSON Schema in [`schemas/`](schemas/), which gives editors autocompletion, documentation on hover and validation as you type. The config files don't reference their schema: editors associate it by path.

**VS Code**: add this to the project's `.vscode/settings.json`.

```json
{
    "json.schemas": [
        {
            "fileMatch": ["**/.aico/company/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/AI-Company/main/schemas/company.json"
        },
        {
            "fileMatch": ["**/.aico/positions/*/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/AI-Company/main/schemas/position.json"
        },
        {
            "fileMatch": ["**/.aico/employees/*/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/AI-Company/main/schemas/employee.json"
        },
        {
            "fileMatch": ["**/.aico/llm-providers/*/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/AI-Company/main/schemas/llm-provider.json"
        },
        {
            "fileMatch": ["**/.aico/llm-providers/*/models/*/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/AI-Company/main/schemas/llm-model.json"
        }
    ]
}
```

**Other editors**: map the same paths to the same URLs in their JSON Schema settings.
