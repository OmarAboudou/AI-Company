import { beforeEach, describe, expect, test } from "bun:test"
import { julieEnvironment } from "../../../work/create-company-with-human-employee.testing.ts"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { addTurnTool } from "../../../work/turn/add-turn-tool.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"
import { openJulieTask } from "./open-julie-task.testing.ts"

const { runCliWithEnv, getProjectPath } = useTemporaryProject()

let threadId = ""

beforeEach(async () => {
    ;({ threadId } = await openJulieTask(getProjectPath()))
})

async function addJulieToolCall(toolName: string, rawInput: string) {
    await addTurnTool(getProjectPath(), julieEnvironment, {
        toolName,
        rawInput,
    })
}

function sendJulieTurn() {
    return runCliWithEnv(julieEnvironment, "turn", "send")
}

describe("aico turn send", () => {
    test("runs the turn's tool calls and shows their results", async () => {
        await addJulieToolCall("message_send", '{"body": "Friday."}')

        const sending = sendJulieTurn()

        expect(sending.exitCode).toBe(0)
        expect(sending.stdout).toBe(
            `→ message_send\n  body: "Friday."\n← Sent as entry #2 of thread ${threadId}.\n\nPrepare your next turn with \`aico turn add\`, then send it.\n`,
        )
    })

    test("reminds the person who calls no tool", async () => {
        await addTurnText(getProjectPath(), julieEnvironment, "Let me think.")

        const sending = sendJulieTurn()

        expect(sending.stdout).toStartWith(
            "Let me think.\nReminder: You ended your turn without calling a tool,",
        )
    })

    test("refuses an empty turn", () => {
        const sending = sendJulieTurn()

        expect(sending.exitCode).toBe(1)
        expect(sending.stderr).toBe(
            "Your turn is empty: add to it with `aico turn add text` or `aico turn add tool`.\n",
        )
    })
})
