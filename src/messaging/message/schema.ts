import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType } from "../../journal/schema.ts"
import {
    CommitterSchema,
    EmployeeSnapshotSchema,
    PositionSnapshotSchema,
    TicketNumberSchema,
} from "../ticket/schema.ts"

export const MessageConfigSchema = z
    .strictObject({
        position: PositionSnapshotSchema.meta({
            description: "The position the message was written from.",
        }),
        employee: EmployeeSnapshotSchema.optional().meta({
            description:
                "The employee who wrote the message, working that position. Absent when a director wrote it: a person working on the repository, whom the committer names.",
        }),
        committer: CommitterSchema,
        sentAt: z.iso.datetime().meta({
            description: "When the message was written, in UTC.",
        }),
    })
    .meta({
        title: "AICo message",
        description:
            "A message of a ticket's discussion, in .aico/tickets/<ticket-number>/messages/<message-id>/message.json. Its body lives next to it, in body.md. Never modified once written.",
    })

export type MessageConfig = z.infer<typeof MessageConfigSchema>

export type Author = Pick<MessageConfig, "position" | "employee" | "committer">

export type UnsentMessage = Author & { body: string }

export type Message = MessageConfig & {
    ticketNumber: number
    id: string
    body: string
}

export const messageSentEventType = defineEventType({
    type: "message-sent",
    description: "A message was added to a ticket's discussion.",
    fields: {
        ticketNumber: TicketNumberSchema,
        messageId: IdSchema.meta({
            description:
                "Id of the message, i.e. the name of its folder in the ticket's messages. Recorded just before the message is written: an interrupted sending can leave it naming no message.",
        }),
        positionId: IdSchema.meta({
            description:
                "Id of the position the message was written from, as its message.json records it.",
        }),
        runId: IdSchema.optional().meta({
            description:
                "Id of the run that posted the message, i.e. the name of its transcript in .aico/.state/runs. Absent for a person's message.",
        }),
    },
})
