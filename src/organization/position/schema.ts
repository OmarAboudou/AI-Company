import { z } from "zod"
import type { IdHistoryRecord } from "../../ids/id-history-schema.ts"
import { IdSchema } from "../../ids/id-schema.ts"

export const PositionConfigSchema = z
    .strictObject({
        title: z.string().trim().min(1).meta({
            description: "Title of the position, e.g. Backend Developer.",
        }),
        employeeId: IdSchema.optional().meta({
            description:
                "Id of the LLM employee holding the position, i.e. the name of its folder in .aico/employees. Absent when the user holds it, the person git names.",
        }),
    })
    .meta({
        title: "AICo position",
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
            kind: z.literal("user").meta({
                description:
                    "user: the user, the person git names, holds the position and works its tasks.",
            }),
        }),
    ])
    .meta({
        description: "Who holds a position: an LLM employee, or the user.",
    })

export type Worker = z.infer<typeof WorkerSchema>

export type PositionAssignment = {
    position: Position
    isDirectorPosition: boolean
    holder: Worker
}
