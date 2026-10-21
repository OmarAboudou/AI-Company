import { beforeEach, describe, expect, test } from "bun:test"
import { julieEnvironment } from "../../../../work/create-company-with-human-employee.testing.ts"
import { loadCurrentStagedTurn } from "../../../../work/turn/load-current-staged-turn.ts"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"
import { openJulieTask } from "../open-julie-task.testing.ts"

const { runCliWithEnv, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    await openJulieTask(getProjectPath())
})

async function loadJulieTurnBlocks() {
    const { blocks } = await loadCurrentStagedTurn(
        getProjectPath(),
        julieEnvironment,
    )
    return blocks
}

function addJulieToolCall(toolName: string, ...options: string[]) {
    const args = ["turn", "add", "tool", toolName, ...options]
    return runCliWithEnv(julieEnvironment, ...args)
}

describe("llmco turn add tool", () => {
    test("adds a call to one of the task's tools", async () => {
        const input = '{"body": "@director Friday."}'

        const adding = addJulieToolCall("message_send", "-i", input)

        const blocks = await loadJulieTurnBlocks()
        expect(adding.exitCode).toBe(0)
        expect(adding.stderr).toBe(
            "Added a call to message_send to your turn. Send it with `llmco turn send`.\n",
        )
        expect(blocks).toMatchObject([
            {
                type: "tool-call",
                name: "message_send",
                input: { body: "@director Friday." },
            },
        ])
    })

    test("reads the input from a file", async () => {
        const inputPath = getProjectPath("input.json")
        await Bun.write(inputPath, '{"summary": "Answered."}')

        addJulieToolCall("task_mark-as-done", "-F", "input.json")

        const blocks = await loadJulieTurnBlocks()
        expect(blocks).toMatchObject([
            { name: "task_mark-as-done", input: { summary: "Answered." } },
        ])
    })

    test("refuses an input its tool rejects, adding nothing", async () => {
        const adding = addJulieToolCall("message_send")

        const blocks = await loadJulieTurnBlocks()
        expect(adding.exitCode).toBe(1)
        expect(adding.stderr).toStartWith("Invalid input for message_send:\n")
        expect(blocks).toEqual([])
    })
})
