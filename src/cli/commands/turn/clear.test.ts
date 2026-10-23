import { beforeEach, describe, expect, test } from "bun:test"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { loadCurrentStagedTurn } from "../../../work/turn/load-current-staged-turn.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"
import { openUserTask } from "./open-user-task.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    await openUserTask(getProjectPath())
})

describe("aico turn clear", () => {
    test("empties the person's next turn", async () => {
        const projectRoot = getProjectPath()
        await addTurnText(projectRoot, {}, "Checking.")

        const clearing = runCli("turn", "clear")

        const { blocks } = await loadCurrentStagedTurn(projectRoot, {})
        expect(clearing.exitCode).toBe(0)
        expect(clearing.stderr).toBe("Emptied your turn.\n")
        expect(blocks).toEqual([])
    })
})
