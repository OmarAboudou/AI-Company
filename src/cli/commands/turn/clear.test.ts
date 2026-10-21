import { beforeEach, describe, expect, test } from "bun:test"
import { julieEnvironment } from "../../../work/create-company-with-human-employee.testing.ts"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { loadCurrentStagedTurn } from "../../../work/turn/load-current-staged-turn.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"
import { openJulieTask } from "./open-julie-task.testing.ts"

const { runCliWithEnv, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    await openJulieTask(getProjectPath())
})

describe("llmco turn clear", () => {
    test("empties the person's next turn", async () => {
        const projectRoot = getProjectPath()
        await addTurnText(projectRoot, julieEnvironment, "Checking.")

        const clearing = runCliWithEnv(julieEnvironment, "turn", "clear")

        const { blocks } = await loadCurrentStagedTurn(
            projectRoot,
            julieEnvironment,
        )
        expect(clearing.exitCode).toBe(0)
        expect(clearing.stderr).toBe("Emptied your turn.\n")
        expect(blocks).toEqual([])
    })
})
