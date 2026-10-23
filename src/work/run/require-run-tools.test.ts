import { describe, expect, test } from "bun:test"
import { requireRunTools } from "./require-run-tools.ts"

describe("requireRunTools", () => {
    test("rebuilds the tools a run was given, with their bound inputs", () => {
        const tools = requireRunTools({
            toolNames: ["ticket_deliver"],
            boundToolInputs: {
                ticket_deliver: { ticketNumber: 1 },
            },
            result: {},
        })

        expect(Object.keys(tools)).toEqual(["ticket_deliver"])
        const deliveryInputNames = Object.keys(
            tools.ticket_deliver?.inputSchema.shape ?? {},
        )
        expect(deliveryInputNames).toEqual(["body"])
    })

    test("refuses a tool this version of AICo doesn't know", () => {
        const requiring = () =>
            requireRunTools({ toolNames: ["git_push"], result: {} })

        expect(requiring).toThrow(
            "The run gives tools this version of AICo doesn't know: git_push. Update AICo to go on with it.",
        )
    })
})
