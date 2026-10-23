import { defineEventType } from "../../journal/schema.ts"

export const companyPausedEventType = defineEventType({
    type: "company-paused",
    description:
        "The director paused the company: no new task starts but the director's until it is relaunched, while the running sessions finish.",
    fields: {},
})

export const companyRelaunchedEventType = defineEventType({
    type: "company-relaunched",
    description:
        "The director relaunched the paused company: its tasks start again.",
    fields: {},
})
