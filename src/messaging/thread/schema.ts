import { z } from "zod"
import {
    CommitterSchema,
    EmployeeSnapshotSchema,
    PositionSnapshotSchema,
} from "../ticket/schema.ts"

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
                employee: EmployeeSnapshotSchema.optional(),
                committer: CommitterSchema,
            })
            .meta({
                description:
                    "Who created the thread: the position it was created from, the employee working it, absent when a director created it, and the committer.",
            }),
    })
    .meta({
        title: "AICo thread",
        description:
            "A thread of messages between positions, in .aico/threads/<thread-id>/thread.json. Its messages live next to it, in messages/<message-id>/. Never modified once written.",
    })

export type ThreadConfig = z.infer<typeof ThreadConfigSchema>

export type Thread = ThreadConfig & {
    id: string
}
