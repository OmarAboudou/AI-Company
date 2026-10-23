import { describe, expect, test } from "bun:test"
import { formatAuthorSignature } from "./format-author-signature.ts"

const position = { id: "backend-developer", title: "Backend Developer" }

const committer = { name: "Omar", email: "omar@example.com" }

describe("formatAuthorSignature", () => {
    test("signs with the employee's name and the position's label", () => {
        const employee = { id: "claude", name: "Claude Senior" }

        const signature = formatAuthorSignature({
            position,
            employee,
            committer,
        })

        expect(signature).toBe(
            "Claude Senior, Backend Developer (@backend-developer)",
        )
    })

    test("signs with the committer's name when a founder wrote", () => {
        const signature = formatAuthorSignature({ position, committer })

        expect(signature).toBe("Omar, Backend Developer (@backend-developer)")
    })
})
