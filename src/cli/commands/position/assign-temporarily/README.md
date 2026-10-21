# `llmco position assign-temporarily`

Assigning a position temporarily, alias `interim`: `employee` to another employee, `directors` to the people working on the repository, who then work it themselves, so that no LLM does its tasks meanwhile. The default employee doesn't change, and the assignment stays on this machine until `unassign-temporarily`.

Who it goes to comes first, as a subcommand: leaving the employee out to mean the directors was easy to get wrong.

## Decisions

- [#56](https://github.com/OmarAboudou/LLM-Company/issues/56): temporary assignments.
