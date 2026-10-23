# Ticket acts

The acts that pass the hand on a ticket: its assignee asks a question or delivers; its requester answers, validates or refuses the delivery, or cancels the ticket; the director closes it as failed. Each act is a message of the ticket's discussion, recorded in the journal as the act it carries, from which the ticket's state follows: open while the assignee has the hand, waiting for the requester's answer, to validate, then closed, done, cancelled or failed.

## Invariants

- An act comes from the position whose role it is, in a state that allows it: anything else is refused, saying who can act, or what the ticket waits for.
- An act always says something: its message is what the other position reads.
- A closed ticket takes no act.
- Every delivery is validated by the requester, even a position's to itself.

## Decisions

- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): the acts, the states they lead to, validation by the requester, and the founder's closing of a ticket as failed.
