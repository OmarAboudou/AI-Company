import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, projectPath } = useTemporaryProject()

describe("llmco position update-id", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Dev", "-d", "Code.")
        runCli("position", "create", "qa-tester", "-t", "QA")
    })

    test("update-id moves the position to its new id", () => {
        const update = runCli("position", "update-id", "developer", "api-dev")
        const show = runCli("position", "show", "api-dev").stdout

        expect(update.stdout).toBe('Position "developer" is now "api-dev".\n')
        expect(show).toBe(
            "# Dev\n\ncurrent employee: (vacant)\ndefault employee: (none)\n\nCode.\n",
        )
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })

    test("update-id refuses an id another position has", () => {
        const update = runCli("position", "update-id", "developer", "qa-tester")
        const show = runCli("position", "show", "qa-tester").stdout

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('Position "qa-tester" already exists.')
        expect(show).toStartWith("# QA\n")
    })
})

describe("the director's position", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    test("update-id makes the company follow", async () => {
        const path = projectPath(".llmco", "company", "config.json")
        const before = await Bun.file(path).json()

        runCli("position", "update-id", "director", "ceo")
        const after = await Bun.file(path).json()

        expect(before.directorPositionId).toBe("director")
        expect(after.directorPositionId).toBe("ceo")
        expect(runCli("position", "show", "director").exitCode).toBe(1)
        expect(runCli("position", "delete", "ceo").exitCode).toBe(1)
    })
})
