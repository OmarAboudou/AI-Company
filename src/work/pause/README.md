# Pause

The pause of the company: until the director relaunches it, no new task starts but the director's, while the sessions already running finish. The director pauses and relaunches the company by command, the management's way of acting, rather than in a task.

## Invariants

- The pause is derived from the journal: the company is paused from a pausing event until the next relaunch.
- Pausing a paused company, or relaunching one that isn't, is refused.
- During a pause, a model's queued task waits, and a person's opens only if it is the director's or already running.

## Decisions

- [#145](https://github.com/OmarAboudou/AI-Company/issues/145): the founder can pause and relaunch the company at any time; during a pause, running sessions finish, and no new task starts except the founder's.
