import { describe, expect, test } from "bun:test"
import { runGit } from "../../git/run-git.ts"
import { useTemporaryProject } from "../use-temporary-project.testing.ts"

const { runCli, runCliInFolder, getProjectPath, getHomePath } =
    useTemporaryProject()

describe("aico init", () => {
    test("creates a company, which carries out the project described", () => {
        const init = runCli(
            "init",
            "--name",
            "Acme",
            "--description",
            "We build things.",
        )
        expect(init.exitCode).toBe(0)

        const companyShow = runCli("company", "show")
        const projectShow = runCli("project", "show")
        expect(companyShow.stdout).toBe("# Acme\n")
        expect(projectShow.stdout).toBe("We build things.\n")
    })

    test("commits the company on branch aico/data, which a clone opens", () => {
        runCli("init", "--name", "Acme")
        const clonePath = getHomePath("clone")
        const cloneArgs = ["clone", "-q", getProjectPath(), clonePath]
        runGit(getHomePath(), cloneArgs)

        const show = runCliInFolder(clonePath, "company", "show")

        const log = runGit(getProjectPath(".aico"), ["log", "--format=%s"])
        expect(log).toBe("aico init")
        expect(show.stdout).toStartWith("# Acme")
    })

    test("refuses to overwrite an existing company", () => {
        runCli("init", "--name", "Acme")

        const secondInit = runCli("init", "--name", "Other")

        expect(secondInit.exitCode).toBe(1)
        expect(runCli("company", "show").stdout).toContain("# Acme")
    })

    test("requires a name", () => {
        expect(runCli("init").exitCode).toBe(1)
    })
})

describe("--description-file", () => {
    const description = "## Mission\n\nYou build the API.\n"

    test("init reads the description from a file", async () => {
        await Bun.write(getProjectPath("project.md"), description)

        runCli("init", "--name", "Acme", "--description-file", "project.md")
        const show = runCli("project", "show").stdout

        expect(show).toBe(`${description}\n`)
    })

    test("cannot be combined with --description", () => {
        const init = runCli(
            "init",
            "--name",
            "Acme",
            "--description",
            "Text",
            "--description-file",
            "project.md",
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

        expect(runCli("company", "show").stdout).toBe("# Acme\n")
        expect(runCli("project", "show").stdout).toBe("We build things.\n")
    })

    test("-F reads the description from a file", async () => {
        await Bun.write(getProjectPath("project.md"), "We build things.")

        runCli("init", "-n", "Acme", "-F", "project.md")

        expect(runCli("project", "show").stdout).toBe("We build things.\n")
    })
})
