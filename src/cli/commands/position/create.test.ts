import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, runCliWithStdin } = useTemporaryProject()

describe("llmco position", () => {
    beforeEach(() => {
        runCli("init", "--name", "Acme")
    })

    test("create then show displays the title and description", () => {
        const creation = runCli(
            "position",
            "create",
            "backend-developer",
            "--title",
            "Backend Developer",
            "--description",
            "You build the API.",
        )
        expect(creation.exitCode).toBe(0)

        const show = runCli("position", "show", "backend-developer")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            "# Backend Developer\n\ncurrent employee: (vacant)\ndefault employee: (none)\n\nYou build the API.\n",
        )
    })

    test("open is an alias of create", () => {
        const opening = runCli(
            "position",
            "open",
            "developer",
            "-t",
            "Developer",
        )
        const show = runCli("position", "show", "developer").stdout

        expect(opening.exitCode).toBe(0)
        expect(show).toContain("# Developer")
    })

    test("create refuses an existing id", () => {
        runCli("position", "create", "developer", "--title", "Developer")

        const duplicate = runCli(
            "position",
            "create",
            "developer",
            "--title",
            "Other",
        )

        expect(duplicate.exitCode).toBe(1)
        expect(runCli("position", "show", "developer").stdout).toContain(
            "# Developer",
        )
    })
})

describe("--description-file", () => {
    const description = "## Mission\n\nYou build the API.\n"

    test("position create reads the description from stdin with -", () => {
        runCli("init", "--name", "Acme")

        const creation = runCliWithStdin(
            description,
            "position",
            "create",
            "developer",
            "--title",
            "Developer",
            "--description-file",
            "-",
        )

        expect(creation.exitCode).toBe(0)
        expect(runCli("position", "show", "developer").stdout).toBe(
            `# Developer\n\ncurrent employee: (vacant)\ndefault employee: (none)\n\n${description}\n`,
        )
    })
})

describe("short options", () => {
    test("position create accepts -t and -d", () => {
        runCli("init", "-n", "Acme")

        runCli(
            "position",
            "create",
            "developer",
            "-t",
            "Developer",
            "-d",
            "You build the API.",
        )

        expect(runCli("position", "show", "developer").stdout).toBe(
            "# Developer\n\ncurrent employee: (vacant)\ndefault employee: (none)\n\nYou build the API.\n",
        )
    })
})
