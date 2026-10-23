import { beforeEach, describe, expect, test } from "bun:test"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { addTurnTool } from "../../../work/turn/add-turn-tool.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"
import { openUserTask } from "./open-user-task.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    await openUserTask(getProjectPath())
})

describe("aico turn show", () => {
    test("shows the turn's texts and tool calls, in order", async () => {
        const projectRoot = getProjectPath()
        await addTurnText(projectRoot, {}, "Checking.\n")
        await addTurnTool(
            projectRoot,
            {},
            {
                toolName: "ticket_ask",
                rawInput: '{"body": "Which build?"}',
            },
        )

        const show = runCli("turn", "show")

        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            'Checking.\n→ ticket_ask\n  body: "Which build?"\n',
        )
    })

    test("says when the turn is empty", () => {
        const show = runCli("turn", "show")

        expect(show.stdout).toBe(
            "Your turn is empty: add to it with `aico turn add text` or `aico turn add tool`.\n",
        )
    })
})
