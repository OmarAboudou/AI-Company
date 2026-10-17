import { describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

const { runCli, projectPath } = useTemporaryProject()

describe("llmco init", () => {
    test("creates a company that company show displays", () => {
        const init = runCli(
            "init",
            "--name",
            "Acme",
            "--description",
            "We build things.",
        )
        expect(init.exitCode).toBe(0)

        const show = runCli("company", "show")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe("# Acme\n\nWe build things.\n")
    })

    test("refuses to overwrite an existing company", () => {
        runCli("init", "--name", "Acme")

        const second = runCli("init", "--name", "Other")

        expect(second.exitCode).toBe(1)
        expect(runCli("company", "show").stdout).toContain("# Acme")
    })

    test("requires a name", () => {
        expect(runCli("init").exitCode).toBe(1)
    })
})

describe("llmco company show", () => {
    test("fails when there is no company", () => {
        expect(runCli("company", "show").exitCode).toBe(1)
    })
})

describe("--description-file", () => {
    const markdown = "## Mission\n\nYou build the API.\n"

    test("init reads the description from a file", async () => {
        await Bun.write(projectPath("company.md"), markdown)

        runCli("init", "--name", "Acme", "--description-file", "company.md")

        expect(runCli("company", "show").stdout).toBe(`# Acme\n\n${markdown}\n`)
    })

    test("cannot be combined with --description", () => {
        const init = runCli(
            "init",
            "--name",
            "Acme",
            "--description",
            "Text",
            "--description-file",
            "company.md",
        )

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toContain("cannot be used with option")
    })

    test("names a missing file", () => {
        const init = runCli(
            "init",
            "--name",
            "Acme",
            "--description-file",
            "nope.md",
        )

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toStartWith("Missing file: nope.md")
    })
})

describe("short options", () => {
    test("init accepts -n and -d", () => {
        runCli("init", "-n", "Acme", "-d", "We build things.")

        expect(runCli("company", "show").stdout).toBe(
            "# Acme\n\nWe build things.\n",
        )
    })

    test("-F reads the description from a file", async () => {
        await Bun.write(projectPath("company.md"), "We build things.")

        runCli("init", "-n", "Acme", "-F", "company.md")

        expect(runCli("company", "show").stdout).toBe(
            "# Acme\n\nWe build things.\n",
        )
    })
})

describe("corrupted files", () => {
    test("company show names the invalid file and field", async () => {
        runCli("init", "--name", "Acme")
        await Bun.write(
            projectPath(".llmco", "company", "config.json"),
            '{ "name": "" }',
        )

        const show = runCli("company", "show")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toStartWith("Invalid .llmco/company/config.json:")
        expect(show.stderr).toContain("at name")
    })
})
