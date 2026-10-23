import { describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { useTemporaryProject } from "./use-temporary-project.testing.ts"

const { runCli, runCliInFolder, getProjectPath } = useTemporaryProject()

describe("the project's root", () => {
    test("is the repository's top folder, wherever in it AICo runs", async () => {
        await mkdir(getProjectPath("src", "api"), { recursive: true })

        const init = runCliInFolder("src/api", "init", "-n", "Acme")
        const show = runCliInFolder("src", "company", "show")

        expect(init.exitCode).toBe(0)
        expect(show.stdout).toStartWith("# Acme")
        expect(runCli("company", "show").stdout).toStartWith("# Acme")
    })
})
