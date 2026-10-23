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
        await addToolCall("ticket_ask", '{"body": "Which build?"}')

        const sending = sendPersonTurn()

        expect(sending.exitCode).toBe(0)
        expect(sending.stdout).toBe(
            `→ ticket_ask\n  body: "Which build?"\n← Question asked, as message #1 of ticket #${ticketNumber}.\n\nTask done: its session passed the hand. Run \`aico task next\` for your next task.\n`,
        )
    })

    test("ends the session at a turn without any tool call", async () => {
        await addTurnText(getProjectPath(), {}, "Friday works.")

        const sending = sendPersonTurn()

        expect(sending.stdout).toBe(
            "Friday works.\n\nTask done: its session ended without passing the hand. Run `aico task next` for your next task.\n",
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
