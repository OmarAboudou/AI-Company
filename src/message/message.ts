import { z } from "zod"
import { IdSchema } from "../ids/id-schema.ts"
import { ProtocolSchema } from "../llm-connection/llm-connection.ts"
import {
    CommitterSchema,
    EmployeeSnapshotSchema,
    PositionSnapshotSchema,
} from "../thread/thread.ts"

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
        response: z.unknown().meta({
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
