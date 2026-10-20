import { describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, runCliWithEnv } = useTemporaryProject()

describe("llmco current-position", () => {
    test("shows that no position is selected", () => {
        const show = runCli("current-position")

        expect(show.stdout).toBe("(none)\n")
    })

    test("shows the position selected in this shell", () => {
        const graphicsEnv = { LLMCO_CURRENT_POSITION_ID: "graphics" }

        const show = runCliWithEnv(graphicsEnv, "current-position", "show")

        expect(show.stdout).toBe("graphics\n")
    })
})
