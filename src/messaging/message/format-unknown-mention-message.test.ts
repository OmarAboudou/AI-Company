import { describe, expect, test } from "bun:test"
import { formatUnknownMentionMessage } from "./format-unknown-mention-message.ts"

describe("formatUnknownMentionMessage", () => {
    test("says that the mention reaches nobody", () => {
        const unknownMentionMessage = formatUnknownMentionMessage("designer")

        expect(unknownMentionMessage).toBe(
            '"@designer" names no position, so it mentions nobody.',
        )
    })
})
