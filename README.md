# llmco

Run a virtual company staffed by LLM agents, from the command line.

A company lives in a `.llmco/` folder at the root of a project: the company itself, its positions (job descriptions) and its employees (an LLM or a human). Everything is a plain file, to edit through the CLI or by hand.

## Getting started

llmco runs on [Bun](https://bun.sh). From a clone of this repository:

```bash
bun install
bun link
```

Then, from any project:

```bash
llmco init -n "Acme" -d "We build things."
llmco position create backend-developer -t "Backend Developer" -d "You build the API."
llmco employee hire llm claude-senior -n "Claude Senior" -p anthropic -m claude-opus-5-5
llmco position assign backend-developer claude-senior
```

`llmco --help` lists every command.

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
        }
    ]
}
```

**Other editors**: map the same paths to the same URLs in their JSON Schema settings.
