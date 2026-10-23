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

function addText(...options: string[]) {
    return runCli("turn", "add", "text", ...options)
}

describe("aico turn add text", () => {
    test("adds a text to the person's next turn", async () => {
        const adding = addText("-t", "Checking.")

        const blocks = await loadTurnBlocks()
        expect(adding.exitCode).toBe(0)
        expect(adding.stderr).toBe(
            "Added a text to your turn. Send it with `aico turn send`.\n",
        )
        expect(blocks).toEqual([{ type: "text", text: "Checking." }])
    })

    test("reads the text from a file", async () => {
        await Bun.write(getProjectPath("notes.md"), "Checked the build.\n")

        addText("-F", "notes.md")

        const blocks = await loadTurnBlocks()
        expect(blocks).toEqual([{ type: "text", text: "Checked the build.\n" }])
    })

    test("asks for the text", () => {
        const adding = addText()

        expect(adding.exitCode).toBe(1)
        expect(adding.stderr).toBe(
            "Give the text with -t, --text or -F, --text-file.\n",
        )
    })
})
