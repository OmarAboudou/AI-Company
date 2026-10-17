import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

const { runCli, runCliWithStdin, projectPath } = useTemporaryProject()

describe("llmco position", () => {
    beforeEach(() => {
        runCli("init", "--name", "Acme")
    })

    test("create then show displays the title and description", () => {
        const create = runCli(
            "position",
            "create",
            "backend-developer",
            "--title",
            "Backend Developer",
            "--description",
            "You build the API.",
        )
        expect(create.exitCode).toBe(0)

        const show = runCli("position", "show", "backend-developer")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            "# Backend Developer\n\ndefault employee: (vacant)\n\nYou build the API.\n",
        )
    })

    test("list aligns titles and employees after the ids, sorted by id", () => {
        runCli("position", "create", "qa-tester", "--title", "QA Tester")
        runCli("position", "create", "developer", "--title", "Developer")

        expect(runCli("position", "list").stdout).toBe(
            "developer  Developer  (vacant)\nqa-tester  QA Tester  (vacant)\n",
        )
    })

    test("list says so when there is no position", () => {
        const list = runCli("position", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No positions yet.")
    })

    test("create refuses an existing id", () => {
        runCli("position", "create", "developer", "--title", "Developer")

        const second = runCli(
            "position",
            "create",
            "developer",
            "--title",
            "Other",
        )

        expect(second.exitCode).toBe(1)
        expect(runCli("position", "show", "developer").stdout).toContain(
            "# Developer",
        )
    })

    test("create rejects an id that is not kebab-case", () => {
        const create = runCli(
            "position",
            "create",
            "../company",
            "--title",
            "X",
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("kebab-case")
    })

    test("show fails for an unknown position", () => {
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })
})

describe("llmco position assign and unassign", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli(
            "employee",
            "create",
            "llm",
            "claude-senior",
            "-n",
            "Claude Senior",
            "-p",
            "anthropic",
            "-m",
            "claude-opus-5-5",
        )
    })

    async function positionConfig(id: string): Promise<unknown> {
        const path = projectPath(".llmco", "positions", id, "config.json")
        return Bun.file(path).json()
    }

    test("assign sets the default employee of a vacant position", async () => {
        const assign = runCli("position", "assign", "developer", "omar")

        expect(assign.exitCode).toBe(0)
        expect(assign.stdout).toBe(
            '"omar" is now the default employee of position "developer".\n',
        )
        expect(await positionConfig("developer")).toEqual({
            title: "Developer",
            defaultEmployee: "omar",
        })
    })

    test("assign refuses to replace a default employee without --replace", async () => {
        runCli("position", "assign", "developer", "claude-senior")

        const assign = runCli("position", "assign", "developer", "omar")

        expect(assign.exitCode).toBe(1)
        expect(assign.stderr).toContain(
            'already has "claude-senior" as default employee',
        )
        expect(assign.stderr).toContain("--replace")
        expect(await positionConfig("developer")).toEqual({
            title: "Developer",
            defaultEmployee: "claude-senior",
        })
    })

    test.each(["--replace", "-r"])(
        "assign %s replaces the default employee",
        async (flag) => {
            runCli("position", "assign", "developer", "claude-senior")

            const assign = runCli(
                "position",
                "assign",
                "developer",
                "omar",
                flag,
            )

            expect(assign.exitCode).toBe(0)
            expect(assign.stdout).toBe(
                '"omar" replaces "claude-senior" as the default employee of position "developer".\n',
            )
            expect(await positionConfig("developer")).toEqual({
                title: "Developer",
                defaultEmployee: "omar",
            })
        },
    )

    test("assign accepts the current default employee again", () => {
        runCli("position", "assign", "developer", "omar")

        const again = runCli("position", "assign", "developer", "omar")

        expect(again.exitCode).toBe(0)
        expect(again.stdout).toContain("is already the default employee")
    })

    test("one employee can be the default employee of several positions", async () => {
        runCli("position", "assign", "developer", "claude-senior")
        runCli("position", "assign", "qa-tester", "claude-senior")

        expect(await positionConfig("developer")).toMatchObject({
            defaultEmployee: "claude-senior",
        })
        expect(await positionConfig("qa-tester")).toMatchObject({
            defaultEmployee: "claude-senior",
        })
    })

    test("assign fails for an unknown position or employee", () => {
        const unknownPosition = runCli("position", "assign", "designer", "omar")
        const unknownEmployee = runCli("position", "assign", "developer", "bob")

        expect(unknownPosition.exitCode).toBe(1)
        expect(unknownEmployee.exitCode).toBe(1)
    })

    test("unassign makes the position vacant", async () => {
        runCli("position", "assign", "developer", "omar")

        const unassign = runCli("position", "unassign", "developer")

        expect(unassign.exitCode).toBe(0)
        expect(unassign.stdout).toContain(
            '"omar" is no longer its default employee',
        )
        expect(await positionConfig("developer")).toEqual({
            title: "Developer",
        })
    })

    test("list and show display the default employee", () => {
        runCli("position", "assign", "qa-tester", "claude-senior")

        expect(runCli("position", "list").stdout).toBe(
            "developer  Developer  (vacant)\n" +
                "qa-tester  QA Tester  claude-senior\n",
        )
        expect(runCli("position", "show", "qa-tester").stdout).toBe(
            "# QA Tester\n\ndefault employee: claude-senior\n\n\n",
        )
    })

    test.each(["--positions", "-p"])(
        "employee list %s shows the positions filled",
        (flag) => {
            runCli("position", "assign", "developer", "claude-senior")
            runCli("position", "assign", "qa-tester", "claude-senior")

            expect(runCli("employee", "list", flag).stdout).toBe(
                "claude-senior  Claude Senior  anthropic/claude-opus-5-5  developer, qa-tester\n" +
                    "omar           Omar           human                      (none)\n",
            )
        },
    )

    test("employee show displays the positions filled", () => {
        runCli("position", "assign", "developer", "claude-senior")
        runCli("position", "assign", "qa-tester", "claude-senior")

        expect(runCli("employee", "show", "claude-senior").stdout).toEndWith(
            "positions: developer, qa-tester\n",
        )
    })

    test("unassign says so when the position is already vacant", () => {
        const unassign = runCli("position", "unassign", "developer")

        expect(unassign.exitCode).toBe(0)
        expect(unassign.stdout).toContain("already vacant")
    })
})

describe("--description-file", () => {
    const markdown = "## Mission\n\nYou build the API.\n"

    test("position create reads the description from stdin with -", () => {
        runCli("init", "--name", "Acme")

        const create = runCliWithStdin(
            markdown,
            "position",
            "create",
            "developer",
            "--title",
            "Developer",
            "--description-file",
            "-",
        )

        expect(create.exitCode).toBe(0)
        expect(runCli("position", "show", "developer").stdout).toBe(
            `# Developer\n\ndefault employee: (vacant)\n\n${markdown}\n`,
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
            "# Developer\n\ndefault employee: (vacant)\n\nYou build the API.\n",
        )
    })
})

describe("corrupted files", () => {
    test("position list names the broken position file", async () => {
        runCli("init", "--name", "Acme")
        runCli("position", "create", "developer", "--title", "Developer")
        await Bun.write(
            projectPath(".llmco", "positions", "developer", "config.json"),
            "{ not json",
        )

        const list = runCli("position", "list")

        expect(list.exitCode).toBe(1)
        expect(list.stderr).toStartWith(
            "Invalid JSON in .llmco/positions/developer/config.json",
        )
    })
})

test("position commands require a company", () => {
    expect(runCli("position", "list").exitCode).toBe(1)
})
