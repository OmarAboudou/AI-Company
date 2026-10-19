import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, runCliWithStdin } = useTemporaryProject()

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
})
