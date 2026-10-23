import { beforeEach, describe, expect, test } from "bun:test"
import { loadCurrentStagedTurn } from "../../../../work/turn/load-current-staged-turn.ts"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"
import { openDirectorsTask } from "../open-directors-task.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    await openDirectorsTask(getProjectPath())
})

async function loadTurnBlocks() {
    const { blocks } = await loadCurrentStagedTurn(getProjectPath(), {})
    return blocks
}

function addToolCall(toolName: string, ...options: string[]) {
    const args = ["turn", "add", "tool", toolName, ...options]
    return runCli(...args)
}

describe("aico turn add tool", () => {
    test("adds a call to one of the task's tools", async () => {
        const input = '{"body": "Friday."}'

        const adding = addToolCall("message_send", "-i", input)

        const blocks = await loadTurnBlocks()
        expect(adding.exitCode).toBe(0)
        expect(adding.stderr).toBe(
            "Added a call to message_send to your turn. Send it with `aico turn send`.\n",
        )
        expect(blocks).toMatchObject([
            {
                type: "tool-call",
                name: "message_send",
                input: { body: "Friday." },
            },
        ])
    })

    test("reads the input from a file", async () => {
        const inputPath = getProjectPath("input.json")
        await Bun.write(inputPath, '{"summary": "Answered."}')

        addToolCall("task_mark-as-done", "-F", "input.json")

        const blocks = await loadTurnBlocks()
        expect(blocks).toMatchObject([
            { name: "task_mark-as-done", input: { summary: "Answered." } },
        ])
    })

    test("refuses an input its tool rejects, adding nothing", async () => {
        const adding = addToolCall("message_send")

        const blocks = await loadTurnBlocks()
        expect(adding.exitCode).toBe(1)
        expect(adding.stderr).toStartWith("Invalid input for message_send:\n")
        expect(blocks).toEqual([])
    })
})
