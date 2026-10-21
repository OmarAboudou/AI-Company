# llmco

Run a virtual company staffed by LLM agents, from the command line.

A company lives in a `.llmco/` folder, in the directory you run llmco from, which must be inside a git repository: the company itself, its positions (job descriptions), its employees (an LLM or a human), the LLM providers whose models its LLM employees run on, the threads of messages its positions exchange, their tasks, and the journal of what happens. Everything is a plain file, to edit through the CLI or by hand.

`llmco init` also creates the director's position, the company's management.

## Getting started

llmco runs on [Bun](https://bun.sh). From a clone of this repository:

```bash
bun install
bun link
```

Then, from any project under git:

```bash
llmco init -n "Acme" -d "We build things."
llmco position create backend-developer -t "Backend Developer" -d "You build the API."
llmco provider create anthropic -n "Anthropic" -e ANTHROPIC_API_KEY
llmco provider connection create anthropic anthropic-messages -u https://api.anthropic.com
llmco model create anthropic claude-opus-5-5 -n "Claude Opus 5.5" -a claude-opus-5-5
llmco employee hire llm claude-senior -n "Claude Senior" -p anthropic -m claude-opus-5-5
llmco position assign backend-developer claude-senior
llmco thread create -s "Choice of framework" -b "@backend-developer Hono or Express for our API?"
llmco run
```

`thread create` prints the new thread's id, and gives `@backend-developer` a task to catch up on the thread. `llmco run` runs it: Claude Senior reads the thread and answers in it, its run printed as it goes. `llmco --help` lists every command.

## Talking to employees

Positions talk through **threads**, like posts in a forum: a subject and messages. You write as a director, signed with your git identity (`user.name` and `user.email`): from the director's position, or from a position assigned temporarily to the directors when it is the only one of yours in the thread. To act as a fictitious human employee instead, run `llmco current-human set <employee-id>`: you then write from its positions, until `llmco current-human clear`. `llmco current-human`, or `llmco whoami`, shows who you are and the positions you work. `llmco current-position set <position-id>` makes you write from one of them until `llmco current-position clear`, and `--as-position <position-id>` chooses another one for a single message. Commands that change the company's configuration, such as `create`, `update`, `delete`, `assign` or `interim`, are reserved to directors: run `llmco current-human clear` first.

```bash
llmco message send <thread-id> -b "@backend-developer Why Hono?"
llmco message send <thread-id> -F question.md         # or -F - for stdin
llmco thread list                                      # with the positions that have a task pending there
llmco thread show <thread-id>                          # in Markdown
llmco thread show <thread-id> --json | jq -r .body     # one message per line
```

Mentioning a position with `@<position-id>` gives it a task, to catch up on the thread; a message without mention asks nothing of anyone. Sending a message from a position marks its tasks in that thread as done.

Whoever works a position is its default employee, unless the position is assigned temporarily: to another employee, or to the directors, the people working on the repository, so that no LLM does its tasks meanwhile. The temporary assignment stays on your machine, in `.llmco/.state/`, which git ignores.

```bash
llmco position interim employee backend-developer claude-junior   # another employee works it
llmco position interim directors backend-developer                 # the directors work it
llmco position end-interim backend-developer                       # back to its default employee
```

The `set` and `clear` commands of `current-human` and `current-position` change your shell's environment, which only llmco's shell function can do, set up once. `llmco shell init <bash|zsh> --install` adds the line evaluating it to `~/.bashrc` or `~/.zshrc`; without `--install`, the command prints the function, for you to place where you prefer. In an llmco project, the function also shows who you are, and the selected position, in your prompt: `(director)`, `(julie)`, `(julie @graphics)`. A script sets `LLMCO_CURRENT_HUMAN_ID` and `LLMCO_CURRENT_POSITION_ID` itself, and `LLMCO_DISABLE_PROMPT` leaves the prompt as it is.

```bash
llmco shell init bash --install         # once, then open a new terminal
llmco current-human set julie           # the prompt shows (julie)
llmco current-position set graphics     # (julie @graphics)
llmco current-human clear               # (director)
```

## Running the company

`llmco run` runs the pending tasks of the positions LLM employees work, one at a time and oldest first, until none is ready; then it lists the tasks left waiting, for a vacant position, a human or the directors, who work theirs themselves (see [Working your tasks](#working-your-tasks)). An error of a provider's API stops it, and the next `llmco run` takes the task up again. Only `llmco run` calls LLMs: sending a message never does.

Each run is a fresh conversation with the employee's model: who it is, the task's situation, such as the thread's unread messages, and tools to read earlier messages, to answer and to mark the task as done or failed. Its messages give tasks in turn, which the same `llmco run` runs. A chain of tasks, such as LLM employees mentioning each other, stops at the company's `maxTaskDepth`, 200 by default, set in `.llmco/company/config.json`.

Everything that happens is recorded in the journal, `.llmco/journal/`, one file per event; tasks live in `.llmco/tasks/`. Each run's whole conversation stays on your machine, in `.llmco/.state/runs/`, which git ignores.

```bash
llmco run                                              # runs what is ready, then lists what waits
```

## Working your tasks

People work their tasks as LLM employees do: the same message, the same tools, turn by turn. llmco thus works without any LLM: two people, each in a terminal as a human employee, talk through their tasks. You work the tasks of the positions you work (see `llmco current-human`), only the selected position's when one is set; as a director, those of the director's position and of the positions assigned temporarily to the directors.

`llmco task work` works them one after the other. It shows each task as a model gets it, its system prompt, its message and its tools, then asks what to do: call a tool, write a text, show, clear or send your turn. For a tool, it asks which one, then each of its inputs, a message's body in your editor (`$VISUAL` or `$EDITOR`). Sending the turn runs its calls and shows their results: `task_mark-as-done` or `task_mark-as-failed` ends the task, and a turn without any call gets the reminder a model gets. Once no task waits, the session waits for the next one, until Ctrl+C, or Ctrl+D as in a shell. What you prepared stays in your turn.

```bash
llmco current-human set julie
llmco task work
```

The same steps are commands of their own, for a script or a turn prepared over time. Your next turn waits in `.llmco/.state/`, as git's index holds a commit before it is made:

```bash
llmco task next                                        # opens your next task, or the one in progress
llmco turn add tool message_send -i '{"body": "@director Friday works."}'
llmco turn add tool task_mark-as-done -i '{"summary": "Answered."}'
llmco turn add text -t "Checked the notes first."      # reaches no one, as a model's text
llmco turn show
llmco turn clear                                       # to prepare the turn again
llmco turn send                                        # runs its calls, then shows their results
```

A person's turns add no link to a chain of tasks: two people talking through their tasks never reach `maxTaskDepth`, while a loop of LLMs passing through a person still stops.

## Connecting to LLM providers

A provider is reached through one **connection** per API protocol it speaks: `anthropic-messages` for now, `openai-chat-completions` and `openai-responses` later. Each model names the protocol it is called with.

Its API key is read from an environment variable (`-e, --api-key-env`) or a file (`-k, --api-key-file`), never written in `.llmco/`. Bun loads a `.env` file from the current directory, so a key in a git-ignored `.env` works; a key file inside the repository must be ignored by git.

Ollama, LM Studio, llama.cpp and OpenRouter also speak Anthropic's Messages API:

```bash
llmco provider create ollama -n "Ollama"
llmco provider connection create ollama anthropic-messages -u http://localhost:11434
llmco model create ollama llama-3-1-8b -n "Llama 3.1 8B" -a llama3.1:8b

llmco provider create openrouter -n "OpenRouter" -e OPENROUTER_API_KEY
llmco provider connection create openrouter anthropic-messages -u https://openrouter.ai/api -a bearer
```

## Editing config files by hand

Every `config.json` under `.llmco/` has a JSON Schema in [`schemas/`](schemas/), which gives editors autocompletion, documentation on hover and validation as you type. The config files don't reference their schema: editors associate it by path.

**VS Code**: add this to the project's `.vscode/settings.json`.

```json
{
    "json.schemas": [
        {
            "fileMatch": ["**/.llmco/company/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/LLM-Company/main/schemas/company.json"
        },
        {
            "fileMatch": ["**/.llmco/positions/*/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/LLM-Company/main/schemas/position.json"
        },
        {
            "fileMatch": ["**/.llmco/employees/*/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/LLM-Company/main/schemas/employee.json"
        },
        {
            "fileMatch": ["**/.llmco/llm-providers/*/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/LLM-Company/main/schemas/llm-provider.json"
        },
        {
            "fileMatch": ["**/.llmco/llm-providers/*/models/*/config.json"],
            "url": "https://raw.githubusercontent.com/OmarAboudou/LLM-Company/main/schemas/llm-model.json"
        }
    ]
}
```

**Other editors**: map the same paths to the same URLs in their JSON Schema settings.
