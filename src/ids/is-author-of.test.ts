import { describe, expect, test } from "bun:test"
import { isAuthorOf } from "./is-author-of.ts"

describe("isAuthorOf", () => {
    const claude = {
        id: "claude-lead",
        createdAt: "2026-10-18T14:00:00.000Z",
        formerIds: [{ id: "claude", until: "2026-10-19T09:00:00.000Z" }],
    }

    function createMessage(employeeId: string, sentAt: string) {
        return { employee: { id: employeeId }, sentAt }
    }

    test("recognizes a message written under a former id", () => {
        const answer = createMessage("claude", "2026-10-18T15:00:00.000Z")

        expect(isAuthorOf(claude, answer)).toBe(true)
    })

    test("leaves out a message written before it was created", () => {
        const formerHolderMessage = createMessage(
            "claude-lead",
            "2026-10-17T15:00:00.000Z",
        )

        expect(isAuthorOf(claude, formerHolderMessage)).toBe(false)
    })

    test("leaves out a message without employee, a director's", () => {
        const directorMessage = { sentAt: "2026-10-18T15:00:00.000Z" }

        expect(isAuthorOf(claude, directorMessage)).toBe(false)
    })
})
