import { z } from "zod"
import {
    EmployeeSnapshotSchema,
    PositionSnapshotSchema,
} from "../thread/thread.ts"

export const MessageConfigSchema = z
    .strictObject({
        position: PositionSnapshotSchema.meta({
            description: "The position the message was written from.",
        }),
        employee: EmployeeSnapshotSchema.meta({
            description:
                "The employee who wrote the message, working that position.",
        }),
        committer: z
            .strictObject({
                name: z.string().trim().min(1),
                email: z.string().trim().min(1),
            })
            .meta({
                description:
                    "The person at the keyboard according to git config user.name and user.email, as in a commit.",
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
