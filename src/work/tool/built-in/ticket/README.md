# Ticket tools

The tools that act on tickets, which no command does: `ticket_create`, the director's, asks a position for work; the acts pass the hand on a ticket, from its assignee, `ticket_ask` and `ticket_deliver`, or from its requester, `ticket_answer`, `ticket_validate`, `ticket_refuse` and `ticket_cancel`, or from the director, `ticket_close`. `ticket_show` shows a ticket's discussion word for word, its messages by their numbers, 20 at most per call, so that a long discussion never floods a run.

## Invariants

- An act's tool takes the message the act carries, and says which message of the discussion it became.
- A refused act is a tool result, saying who can act or what the ticket waits for, for the caller to act otherwise.

## Decisions

- [#123](https://github.com/OmarAboudou/AI-Company/issues/123): conversations stay readable word for word through tools.
- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): acts on tickets as AICo's tools, and a tool to read the messages of a ticket's discussion that a session's first message leaves out.
