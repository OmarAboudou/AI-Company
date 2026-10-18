import { z } from "zod"
import { IdSchema } from "../id.ts"
import type { IdHistoryRecord } from "../id-history.ts"

export const PositionConfigSchema = z
    .strictObject({
        title: z.string().trim().min(1).meta({
            description: "Title of the position, e.g. Backend Developer.",
        }),
        defaultEmployeeId: IdSchema.optional().meta({
            description:
                "Id of the employee working this position by default, i.e. the name of its folder in .llmco/employees. Absent when the position is vacant.",
        }),
    })
    .meta({
        title: "llmco position",
        description:
            "Configuration of a position, in .llmco/positions/<position-id>/config.json. Its job description lives next to it, in description.md.",
    })

export type PositionConfig = z.infer<typeof PositionConfigSchema>

export type Position = PositionConfig &
    IdHistoryRecord & {
        id: string
        description: string
    }
