# `aico ticket`

Reading the tickets: `ticket list` lists them with their state and their two positions, and `ticket show` displays one, its request and its discussion, or, with `--json`, its messages one per line, for `jq` and `tail`. A position acts on its tickets through the tools of its sessions, not through commands.

## Decisions

- [#56](https://github.com/OmarAboudou/AI-Company/issues/56): discussions shown in Markdown or as JSON Lines.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): tickets, and acts on them as tools.
