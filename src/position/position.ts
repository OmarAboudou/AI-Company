import { z } from "zod"

export const PositionIdSchema = z
    .string()
    .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "must be kebab-case, e.g. backend-developer",
    )

export const PositionConfigSchema = z.strictObject({
    title: z.string().trim().min(1),
})

export type PositionConfig = z.infer<typeof PositionConfigSchema>

export type Position = PositionConfig & {
    id: string
    description: string
}
