import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { createUnsentMessage } from "./create-unsent-message.ts"
import type { Author } from "./schema.ts"

const founder: Author = {
    position: { id: "founder", title: "Founder" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
}

describe("createUnsentMessage", () => {
    test("keeps the author and the body", () => {
        const body = "A test plan?"

        const unsentMessage = createUnsentMessage(founder, body)

        expect(unsentMessage).toEqual({ ...founder, body })
    })

    test("refuses an empty body", () => {
        const creation = () => createUnsentMessage(founder, "  \n")

        expect(creation).toThrow(UserError)
        expect(creation).toThrow("The message's body is empty.")
    })
})
