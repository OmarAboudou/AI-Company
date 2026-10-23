# Ids

How AICo names what it stores, so that names stay readable in files, in mentions and on the command line: ids in kebab-case, ids ordered by time for what is only ever added, and the history of the ids a position or an employee had.

## Invariants

- An id is in kebab-case: lowercase letters and digits separated by single hyphens. An entity's id is the name of its folder or file, never repeated inside its configuration.
- What is only ever added, messages, events and runs, gets an id made of its time and a random suffix: ids sort in the order things happened, and two machines never write the same one.
- Renaming a position or an employee adds its former id to its history, with when it changed, and rewrites nothing written before: what names a former id at a given moment designates whoever held it then, as a call log from before a phone number was reassigned concerns its former subscriber.
- A position or an employee created before AICo recorded its history counts as existing since always.

## Decisions

- [#7](https://github.com/OmarAboudou/LLM-Company/issues/7): an entity's id is its folder's name, never repeated inside its configuration.
- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): the dated history of renamed ids, and ids ordered by time for messages.
- [#123](https://github.com/OmarAboudou/LLM-Company/issues/123): ids ordered by time for events.
