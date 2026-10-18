import { beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
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

    test("creates the director's position, held by no employee", () => {
        const init = runCli("init", "-n", "Acme")
        const position = runCli("position", "show", "director").stdout

        expect(init.stdout).toBe(
            'Created company "Acme" and its director\'s position "director".\n',
        )
        expect(position).toBe(
            "# Director\n\nheld by: the repository's git users\n\n\n",
        )
        expect(runCli("employee", "list").stdout).toContain("No employees")
    })

    test("names the company's director's position in its config", async () => {
        runCli("init", "-n", "Acme")

        const path = projectPath(".llmco", "company", "config.json")
        const config = await Bun.file(path).json()

        expect(config).toEqual({ name: "Acme", directorPositionId: "director" })
    })

    test("records when the director's position was created", async () => {
        const path = projectPath(
            ".llmco",
            "positions",
            "director",
            "config.json",
        )
        const before = Date.now()

        runCli("init", "-n", "Acme")
        const after = Date.now()

        const created = Date.parse((await Bun.file(path).json()).createdAt)

        expect(created).toBeGreaterThanOrEqual(before)
        expect(created).toBeLessThanOrEqual(after)
    })

    test("refuses a directory outside any git repository", async () => {
        await rm(projectPath(".git"), { recursive: true })

        const init = runCli("init", "-n", "Acme")

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toContain("Run `git init` first.")
        expect(runCli("company", "show").exitCode).toBe(1)
    })
})

describe("the director's position", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    test("can't be assigned an employee", () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar")

        const assignment = runCli("position", "assign", "director", "omar")

        expect(assignment.exitCode).toBe(1)
        expect(assignment.stderr).toContain("not an employee")
        expect(runCli("position", "list").stdout).toContain("(git users)")
    })

    test("can't be deleted", () => {
        const deletion = runCli("position", "delete", "director")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("is the director's position")
        expect(runCli("position", "show", "director").exitCode).toBe(0)
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

describe("llmco company show", () => {
    test("fails when there is no company", () => {
        expect(runCli("company", "show").exitCode).toBe(1)
    })
})

describe("llmco company update", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme", "-d", "We build things.")
    })

    test("update -n changes the name and keeps the description", () => {
        const update = runCli("company", "update", "-n", "Acme Inc.")
        const show = runCli("company", "show").stdout

        expect(update.stdout).toBe('Updated company "Acme Inc.".\n')
        expect(show).toBe("# Acme Inc.\n\nWe build things.\n")
    })

    test("update -d changes the description and keeps the name", () => {
        runCli("company", "update", "-d", "We build better things.")

        const show = runCli("company", "show").stdout

        expect(show).toBe("# Acme\n\nWe build better things.\n")
    })

    test("update -F reads the new description from a file", async () => {
        await Bun.write(projectPath("company.md"), "From a file.")

        runCli("company", "update", "-F", "company.md")

        const show = runCli("company", "show").stdout
        expect(show).toBe("# Acme\n\nFrom a file.\n")
    })

    test("update requires at least one option", () => {
        const update = runCli("company", "update")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })

    test("update validates like init", () => {
        const update = runCli("company", "update", "-n", " ")
        const show = runCli("company", "show").stdout

        expect(update.exitCode).toBe(1)
        expect(show).toStartWith("# Acme\n")
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
