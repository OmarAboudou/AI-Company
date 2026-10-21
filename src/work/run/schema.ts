import { IdSchema } from "../../ids/id-schema.ts"

export const RunIdSchema = IdSchema.meta({
    description:
        "Id of the run, i.e. the name of its transcript in .llmco/.state/runs, kept on the machine that ran it.",
})
