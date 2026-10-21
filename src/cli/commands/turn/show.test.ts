import { beforeEach, describe, expect, test } from "bun:test"
import { julieEnvironment } from "../../../work/create-company-with-human-employee.testing.ts"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { addTurnTool } from "../../../work/turn/add-turn-tool.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"
import { openJulieTask } from "./open-julie-task.testing.ts"

const { runCliWithEnv, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    await openJulieTask(getProjectPath())
})

describe("llmco turn show", () => {
    test("shows the turn's texts and tool calls, in order", async () => {
        const projectRoot = getProjectPath()
        await addTurnText(projectRoot, julieEnvironment, "Checking.\n")
        await addTurnTool(projectRoot, julieEnvironment, {
            toolName: "message_send",
            rawInput: '{"body": "@director Friday."}',
        })

        const show = runCliWithEnv(julieEnvironment, "turn", "show")

        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            'Checking.\n→ message_send\n  body: "@director Friday."\n',
        )
    })

    test("says when the turn is empty", () => {
        const show = runCliWithEnv(julieEnvironment, "turn", "show")

        expect(show.stdout).toBe(
            "Your turn is empty: add to it with `llmco turn add text` or `llmco turn add tool`.\n",
        )
    })
})
