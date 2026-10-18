import { beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { useTemporaryProject } from "../cli-test-helpers.ts"

const { runCli, runCliWithEnv, projectPath } = useTemporaryProject()

function runGit(...args: string[]) {
    Bun.spawnSync(["git", ...args], { cwd: projectPath() })
}

describe("llmco init", () => {
    test("creates a company that company show displays", () => {
        const init = runCli(
            "init",
            "--name",
            "Acme",
            "--description",
            "We build things.",
            "-D",
            "founder",
        )
        expect(init.exitCode).toBe(0)

        const show = runCli("company", "show")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe("# Acme\n\nWe build things.\n")
    })

    test("refuses to overwrite an existing company", () => {
        runCli("init", "--name", "Acme", "-D", "founder")

        const second = runCli("init", "--name", "Other", "-D", "founder")

        expect(second.exitCode).toBe(1)
        expect(runCli("company", "show").stdout).toContain("# Acme")
    })

    test("requires a name", () => {
        const init = runCli("init", "-D", "founder")

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toContain("--name")
    })

    test("creates the director's position, held by the director", () => {
        const init = runCli("init", "-n", "Acme", "--director", "founder")
        const position = runCli("position", "show", "director").stdout
        const director = runCli("employee", "show", "founder").stdout

        expect(init.stdout).toBe(
            'Created company "Acme", directed by "founder" (Test User).\n',
        )
        expect(position).toBe("# Director\n\ndefault employee: founder\n\n\n")
        expect(director).toBe(
            "# Test User\n\nkind: human\npositions: director\n",
        )
    })

    test("names the company's director's position in its config", async () => {
        runCli("init", "-n", "Acme", "-D", "founder")

        const path = projectPath(".llmco", "company", "config.json")
        const config = await Bun.file(path).json()

        expect(config).toEqual({ name: "Acme", directorPositionId: "director" })
    })

    test.each(["--director-name", "-N"])(
        "%s names the director instead of git",
        (flag) => {
            runCli("init", "-n", "Acme", "-D", "omar", flag, "Omar Aboudou")

            const director = runCli("employee", "show", "omar").stdout

            expect(director).toContain("# Omar Aboudou\n")
        },
    )

    test("requires a director", () => {
        const init = runCli("init", "-n", "Acme")

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toContain("--director")
    })

    test("refuses a director without a name", () => {
        runGit("config", "--unset", "user.name")
        const withoutGlobalConfig = {
            GIT_CONFIG_GLOBAL: "/dev/null",
            GIT_CONFIG_NOSYSTEM: "1",
        }

        const init = runCliWithEnv(
            withoutGlobalConfig,
            "init",
            "-n",
            "Acme",
            "-D",
            "founder",
        )

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toContain("pass --director-name")
    })

    test("refuses a directory outside any git repository", async () => {
        await rm(projectPath(".git"), { recursive: true })

        const init = runCli("init", "-n", "Acme", "-D", "founder")

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toContain("Run `git init` first.")
        expect(runCli("company", "show").exitCode).toBe(1)
    })
})

describe("llmco company show", () => {
    test("fails when there is no company", () => {
        expect(runCli("company", "show").exitCode).toBe(1)
    })
})

describe("llmco company update", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme", "-d", "We build things.", "-D", "founder")
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

        runCli(
            "init",
            "--name",
            "Acme",
            "--description-file",
            "company.md",
            "-D",
            "founder",
        )

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
            "-D",
            "founder",
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
            "-D",
            "founder",
        )

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toStartWith("Missing file: nope.md")
    })
})

describe("short options", () => {
    test("init accepts -n and -d", () => {
        runCli("init", "-n", "Acme", "-d", "We build things.", "-D", "founder")

        expect(runCli("company", "show").stdout).toBe(
            "# Acme\n\nWe build things.\n",
        )
    })

    test("-F reads the description from a file", async () => {
        await Bun.write(projectPath("company.md"), "We build things.")

        runCli("init", "-n", "Acme", "-F", "company.md", "-D", "founder")

        expect(runCli("company", "show").stdout).toBe(
            "# Acme\n\nWe build things.\n",
        )
    })
})

describe("corrupted files", () => {
    test("company show names the invalid file and field", async () => {
        runCli("init", "--name", "Acme", "-D", "founder")
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
