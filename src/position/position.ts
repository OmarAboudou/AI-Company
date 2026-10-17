import { z } from "zod"

export const PositionConfigSchema = z.strictObject({
    title: z.string().trim().min(1),
})

export type PositionConfig = z.infer<typeof PositionConfigSchema>

export type Position = PositionConfig & {
    id: string
    description: string
}
