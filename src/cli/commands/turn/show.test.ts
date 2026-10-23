import { beforeEach, describe, expect, test } from "bun:test"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { addTurnTool } from "../../../work/turn/add-turn-tool.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"
import { openDirectorsTask } from "./open-directors-task.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    await openDirectorsTask(getProjectPath())
})

describe("aico turn show", () => {
    test("shows the turn's texts and tool calls, in order", async () => {
        const projectRoot = getProjectPath()
        await addTurnText(projectRoot, {}, "Checking.\n")
        await addTurnTool(
            projectRoot,
            {},
            {
                toolName: "message_send",
                rawInput: '{"body": "Friday."}',
            },
        )

        const show = runCli("turn", "show")

        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            'Checking.\n→ message_send\n  body: "Friday."\n',
        )
    })

    test("says when the turn is empty", () => {
        const show = runCli("turn", "show")

        expect(show.stdout).toBe(
            "Your turn is empty: add to it with `aico turn add text` or `aico turn add tool`.\n",
        )
    })
})
