import { describe, expect, test } from "bun:test"
import { requireRunTools } from "./require-run-tools.ts"

describe("requireRunTools", () => {
    test("rebuilds the tools a run was given, with their bound inputs", () => {
        const tools = requireRunTools({
            toolNames: ["message_send"],
            boundToolInputs: {
                message_send: { ticketNumber: 1 },
            },
            result: {},
        })

        expect(Object.keys(tools)).toEqual([
            "message_send",
            "task_mark-as-done",
            "task_mark-as-failed",
        ])
        const messageSendInputNames = Object.keys(
            tools.message_send?.inputSchema.shape ?? {},
        )
        expect(messageSendInputNames).toEqual(["body"])
    })

    test("refuses a tool this version of AICo doesn't know", () => {
        const requiring = () =>
            requireRunTools({ toolNames: ["git_push"], result: {} })

        expect(requiring).toThrow(
            "The run gives tools this version of AICo doesn't know: git_push. Update AICo to go on with it.",
        )
    })
})
