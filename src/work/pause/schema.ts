import { defineEventType } from "../../journal/schema.ts"

export const companyPausedEventType = defineEventType({
    type: "company-paused",
    description:
        "The founder paused the company: no new task starts but the founder's until it is relaunched, while the running sessions finish.",
    fields: {},
})

export const companyRelaunchedEventType = defineEventType({
    type: "company-relaunched",
    description:
        "The founder relaunched the paused company: its tasks start again.",
    fields: {},
})
