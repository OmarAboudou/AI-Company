import { beforeEach, describe, expect, test } from "bun:test"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { addTurnTool } from "../../../work/turn/add-turn-tool.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"
import { openDirectorsTask } from "./open-directors-task.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

let ticketNumber = 0

beforeEach(async () => {
    ;({ ticketNumber } = await openDirectorsTask(getProjectPath()))
})

async function addToolCall(toolName: string, rawInput: string) {
    await addTurnTool(
        getProjectPath(),
        {},
        {
            toolName,
            rawInput,
        },
    )
}

function sendPersonTurn() {
    return runCli("turn", "send")
}

describe("aico turn send", () => {
    test("runs the turn's tool calls and shows their results", async () => {
        await addToolCall("message_send", '{"body": "Friday."}')

        const sending = sendPersonTurn()

        expect(sending.exitCode).toBe(0)
        expect(sending.stdout).toBe(
            `→ message_send\n  body: "Friday."\n← Sent as message #2 of ticket #${ticketNumber}.\n\nPrepare your next turn with \`aico turn add\`, then send it.\n`,
        )
    })

    test("reminds the person who calls no tool", async () => {
        await addTurnText(getProjectPath(), {}, "Let me think.")

        const sending = sendPersonTurn()

        expect(sending.stdout).toStartWith(
            "Let me think.\nReminder: You ended your turn without calling a tool,",
        )
    })

    test("refuses an empty turn", () => {
        const sending = sendPersonTurn()

        expect(sending.exitCode).toBe(1)
        expect(sending.stderr).toBe(
            "Your turn is empty: add to it with `aico turn add text` or `aico turn add tool`.\n",
        )
    })
})
