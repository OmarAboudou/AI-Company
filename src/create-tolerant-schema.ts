import { z } from "zod"

// An event or a task's result written by a newer llmco may carry fields that
// this one doesn't know: reading ignores them, at any depth, while recording
// still refuses them.
export function createTolerantSchema(schema: z.core.$ZodType): z.core.$ZodType {
    if (schema instanceof z.ZodObject) {
        const tolerantShape = Object.fromEntries(
            Object.entries(schema.shape).map(([key, fieldSchema]) => [
                key,
                createTolerantSchema(fieldSchema),
            ]),
        )
        return z.object(tolerantShape)
    }
    if (schema instanceof z.ZodOptional) {
        return z.optional(createTolerantSchema(schema.unwrap()))
    }
    if (schema instanceof z.ZodArray) {
        return z.array(createTolerantSchema(schema.element))
    }
    return schema
}
