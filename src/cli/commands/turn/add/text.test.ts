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

function addJulieText(...options: string[]) {
    return runCliWithEnv(julieEnvironment, "turn", "add", "text", ...options)
}

describe("llmco turn add text", () => {
    test("adds a text to the person's next turn", async () => {
        const adding = addJulieText("-t", "Checking.")

        const blocks = await loadJulieTurnBlocks()
        expect(adding.exitCode).toBe(0)
        expect(adding.stderr).toBe(
            "Added a text to your turn. Send it with `llmco turn send`.\n",
        )
        expect(blocks).toEqual([{ type: "text", text: "Checking." }])
    })

    test("reads the text from a file", async () => {
        await Bun.write(getProjectPath("notes.md"), "Checked the build.\n")

        addJulieText("-F", "notes.md")

        const blocks = await loadJulieTurnBlocks()
        expect(blocks).toEqual([{ type: "text", text: "Checked the build.\n" }])
    })

    test("asks for the text", () => {
        const adding = addJulieText()

        expect(adding.exitCode).toBe(1)
        expect(adding.stderr).toBe(
            "Give the text with -t, --text or -F, --text-file.\n",
        )
    })
})
