import { expect, test } from "bun:test"
import { IdSchema } from "./id-schema.ts"

test.each(["developer", "backend-developer", "level-2-support"])(
    "accepts %s",
    (id) => {
        expect(IdSchema.safeParse(id).success).toBe(true)
    },
)

test.each([
    "",
    "Backend-Developer",
    "backend developer",
    "backend_developer",
    "-developer",
    "developer-",
    "backend--developer",
    "../company",
    "llama3.1:8b",
])("rejects %p", (id) => {
    expect(IdSchema.safeParse(id).success).toBe(false)
})
