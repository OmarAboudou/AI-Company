import { z } from "zod"
import { IdSchema } from "../id.ts"

export const PositionConfigSchema = z.strictObject({
    title: z.string().trim().min(1),
    defaultEmployee: IdSchema.optional(),
})

export type PositionConfig = z.infer<typeof PositionConfigSchema>

export type Position = PositionConfig & {
    id: string
    description: string
}
