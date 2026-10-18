import { z } from "zod"
import { IdSchema } from "../id.ts"

export const PositionSnapshotSchema = z
    .strictObject({
        id: IdSchema,
        title: z.string().trim().min(1),
    })
    .meta({
        description:
            "A position as it was when this was written: its id and title. Never rewritten afterwards, even if the position is renamed or deleted.",
    })

export const EmployeeSnapshotSchema = z
    .strictObject({
        id: IdSchema,
        name: z.string().trim().min(1),
    })
    .meta({
        description:
            "An employee as it was when this was written: its id and name. Never rewritten afterwards.",
    })

export const ThreadConfigSchema = z
    .strictObject({
        subject: z.string().trim().min(1).meta({
            description: "Subject of the thread, e.g. Choice of framework.",
        }),
        createdAt: z.iso.datetime().meta({
            description: "When the thread was created, in UTC.",
        }),
        createdBy: z
            .strictObject({
                position: PositionSnapshotSchema,
                employee: EmployeeSnapshotSchema,
            })
            .meta({
                description:
                    "Who created the thread: the position it was created from, and the employee working it.",
            }),
    })
    .meta({
        title: "llmco thread",
        description:
            "A thread of messages between positions, in .llmco/threads/<thread-id>/thread.json. Its messages live next to it, in messages/<message-id>/. Never modified once written.",
    })

export type ThreadConfig = z.infer<typeof ThreadConfigSchema>

export type Thread = ThreadConfig & {
    id: string
}
