import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType } from "../../journal/schema.ts"
import { ProtocolSchema } from "../../llm/connection/schema.ts"
import {
    CommitterSchema,
    EmployeeSnapshotSchema,
    PositionSnapshotSchema,
} from "../thread/schema.ts"

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
        mentions: z.array(IdSchema).meta({
            description:
                "Ids of the positions the message mentions with @<position-id>, asked to act: whoever works them answers. Read from the body when the message is written.",
        }),
        sentAt: z.iso.datetime().meta({
            description: "When the message was written, in UTC.",
        }),
    })
    .meta({
        title: "llmco message",
        description:
            "A message of a thread, in .llmco/threads/<thread-id>/messages/<message-id>/message.json. Its body lives next to it, in body.md. Never modified once written.",
    })

export type MessageConfig = z.infer<typeof MessageConfigSchema>

export type Author = Pick<MessageConfig, "position" | "employee" | "committer">

export type UnsentMessage = Author & {
    body: string
    mentions: string[]
    unknownMentionIds: string[]
}

export type Message = MessageConfig & {
    threadId: string
    id: string
    body: string
}

export const ProviderResponseSchema = z
    .strictObject({
        providerId: IdSchema,
        modelId: IdSchema,
        protocol: ProtocolSchema,
        apiId: z.string().min(1),
        payload: z.unknown().meta({
            description:
                "The provider's response, as its API returned it: thinking, text, usage.",
        }),
    })
    .meta({
        title: "llmco provider response",
        description:
            "The raw response behind a message written by an LLM employee, in .llmco/threads/<thread-id>/messages/<message-id>/response.json, so that the same model can be given its own message back exactly.",
    })

export type ProviderResponse = z.infer<typeof ProviderResponseSchema>

export const messageSentEventType = defineEventType({
    type: "message-sent",
    description: "A message was added to a thread.",
    fields: {
        threadId: IdSchema.meta({
            description:
                "Id of the thread, i.e. the name of its folder in .llmco/threads.",
        }),
        messageId: IdSchema.meta({
            description:
                "Id of the message, i.e. the name of its folder in the thread's messages. Recorded just before the message is written: an interrupted sending can leave it naming no message.",
        }),
        mentions: z.array(IdSchema).meta({
            description:
                "Ids of the positions the message mentions, as its message.json records them.",
        }),
    },
})
