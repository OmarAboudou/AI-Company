import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

type History = {
    createdAt: string
    formerIds?: { id: string; until: string }[]
}

const { runCli, runCliWithStdin, projectPath } = useTemporaryProject()

describe("llmco position update", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Dev", "-d", "Code.")
    })

    test("update -t changes the title and keeps the description", () => {
        const update = runCli("position", "update", "developer", "-t", "Lead")
        const show = runCli("position", "show", "developer").stdout

        expect(update.stdout).toBe('Updated position "developer".\n')
        expect(show).toBe(
            "# Lead\n\ncurrent employee: (vacant)\ndefault employee: (none)\n\nCode.\n",
        )
    })

    test("update -d changes the description and keeps the title", () => {
        runCli("position", "update", "developer", "-d", "Review code.")

        const show = runCli("position", "show", "developer").stdout

        expect(show).toStartWith("# Dev\n")
        expect(show).toEndWith("\n\nReview code.\n")
    })

    test("update keeps the default employee", () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("position", "assign", "developer", "omar")

        runCli("position", "update", "developer", "-t", "Lead")

        const show = runCli("position", "show", "developer").stdout
        expect(show).toContain("default employee: omar")
    })

    test("update -F - reads the new description from stdin", () => {
        const update = ["position", "update", "developer", "-F", "-"]

        runCliWithStdin("From stdin.", ...update)

        const show = runCli("position", "show", "developer").stdout
        expect(show).toEndWith("From stdin.\n")
    })

    test("update requires at least one option", () => {
        const update = runCli("position", "update", "developer")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })

    test("update fails for an unknown position", () => {
        const update = runCli("position", "update", "qa-tester", "-t", "QA")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('No position "qa-tester".')
    })
})

describe("a position's id history", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    async function history(id: string): Promise<History> {
        const path = projectPath(".llmco", "positions", id, "history.json")
        const { createdAt, formerIds } = await Bun.file(path).json()
        return { createdAt, formerIds }
    }

    test("update keeps the history", async () => {
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "update-id", "developer", "api-developer")
        const before = await history("api-developer")

        runCli("position", "update", "api-developer", "-t", "API Developer")
        const after = await history("api-developer")

        expect(before.formerIds).toHaveLength(1)
        expect(after).toEqual(before)
    })
})
