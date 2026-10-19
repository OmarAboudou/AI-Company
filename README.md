# llmco

Run a virtual company staffed by LLM agents, from the command line.

A company lives in a `.llmco/` folder, in the directory you run llmco from, which must be inside a git repository: the company itself, its positions (job descriptions), its employees (an LLM or a human), the LLM providers whose models its LLM employees run on, and the threads of messages its positions exchange. Everything is a plain file, to edit through the CLI or by hand.

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
```

The last command prints the new thread's id, then Claude Senior's answer as it is written. `llmco --help` lists every command.

## Talking to employees

Positions talk through **threads**, like posts in a forum: a subject and messages. You write from the director's position, signed with your git identity (`user.name` and `user.email`).

```bash
llmco message send <thread-id> -b "@backend-developer Why Hono?"
llmco message send <thread-id> -F question.md         # or -F - for stdin
llmco thread list                                      # with the positions each thread awaits
llmco thread show <thread-id>                          # in Markdown
llmco thread show <thread-id> --json | jq -r .body     # one message per line
```

Mentioning a position with `@<position-id>` asks whoever works it to act: an LLM employee answers right away, the answer printed as it streams; a human, or a vacant position, leaves the thread awaiting it. A message without mention asks nothing of anyone.

Whoever works a position is its default employee, unless the position is assigned temporarily: to another employee, or to the directors, the people working on the repository, so that no LLM answers its mentions meanwhile. The temporary assignment stays on your machine, in `.llmco/.state/`, which git ignores.

```bash
llmco position interim employee backend-developer claude-junior   # another employee works it
llmco position interim directors backend-developer                 # the directors work it
llmco position end-interim backend-developer                       # back to its default employee
```

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
