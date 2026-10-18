import { describe, expect, test } from "bun:test"
import { MessageConfigSchema } from "./message.ts"

const question = {
    position: { id: "director", title: "Director" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    sentAt: "2026-10-18T14:03:22.123Z",
}

function accepts(config: unknown): boolean {
    return MessageConfigSchema.safeParse(config).success
}

describe("MessageConfigSchema", () => {
    test("accepts a position, a committer and a date", () => {
        expect(MessageConfigSchema.parse(question)).toEqual(question)
    })

    test("accepts the employee who wrote it", () => {
        const employee = { id: "julie", name: "Julie" }

        expect(accepts({ ...question, employee })).toBe(true)
    })

    test("requires the committer's name and email", () => {
        const committer = { name: "Omar Aboudou" }

        expect(accepts({ ...question, committer })).toBe(false)
    })

    test("rejects a position id that isn't kebab-case", () => {
        const position = { id: "Director", title: "Director" }

        expect(accepts({ ...question, position })).toBe(false)
    })

    test("rejects an unknown key, such as the body", () => {
        expect(accepts({ ...question, body: "Hi" })).toBe(false)
    })
})
