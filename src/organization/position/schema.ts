import { z } from "zod"
import type { IdHistoryRecord } from "../../ids/id-history-schema.ts"
import { IdSchema } from "../../ids/id-schema.ts"

export const PositionConfigSchema = z
    .strictObject({
        title: z.string().trim().min(1).meta({
            description: "Title of the position, e.g. Backend Developer.",
        }),
        defaultEmployeeId: IdSchema.optional().meta({
            description:
                "Id of the employee working this position by default, i.e. the name of its folder in .aico/employees. Absent when the position is vacant.",
        }),
    })
    .meta({
        title: "llmco position",
        description:
            "Configuration of a position, in .aico/positions/<position-id>/config.json. Its job description lives next to it, in description.md.",
    })

export type PositionConfig = z.infer<typeof PositionConfigSchema>

export type Position = PositionConfig &
    IdHistoryRecord & {
        id: string
        description: string
    }

export const WorkerSchema = z
    .discriminatedUnion("kind", [
        z.strictObject({
            kind: z.literal("employee").meta({
                description: "employee: an employee works the position.",
            }),
            employeeId: IdSchema.meta({
                description:
                    "Id of the employee working the position, i.e. the name of its folder in .aico/employees.",
            }),
        }),
        z.strictObject({
            kind: z.literal("directors").meta({
                description:
                    "directors: the people working on the repository, identified by git, work the position themselves, without an employee.",
            }),
        }),
    ])
    .meta({
        description:
            "Who works a position: an employee, or the directors themselves.",
    })

export type Worker = z.infer<typeof WorkerSchema>

export const PositionStateSchema = z
    .strictObject({
        temporaryAssignment: WorkerSchema.optional().meta({
            description:
                "Who works the position instead of its default employee, until unassign-temporarily. Never its default employee.",
        }),
    })
    .meta({
        title: "llmco position state",
        description:
            "What happens to a position while the company runs, in .aico/.state/positions/<position-id>.json. Written by llmco and ignored by git; absent while the position's default employee works it, or nobody if it is vacant.",
    })

export type PositionState = z.infer<typeof PositionStateSchema>

export type PositionAssignment = {
    position: Position
    isDirectorPosition: boolean
    state: PositionState
    currentWorker: Worker | undefined
}
