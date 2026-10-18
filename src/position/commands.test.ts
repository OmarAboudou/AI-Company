import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

type History = {
    createdAt: string
    formerIds?: { id: string; until: string }[]
}

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

    test("open is an alias of create", () => {
        const open = runCli("position", "open", "developer", "-t", "Developer")
        const show = runCli("position", "show", "developer").stdout

        expect(open.exitCode).toBe(0)
        expect(show).toContain("# Developer")
    })

    test("list aligns titles and employees after the ids, sorted by id", () => {
        runCli("position", "create", "qa-tester", "--title", "QA Tester")
        runCli("position", "create", "developer", "--title", "Developer")

        expect(runCli("position", "list").stdout).toBe(
            "developer  Developer  (vacant)\n" +
                "director   Director   (git users)\n" +
                "qa-tester  QA Tester  (vacant)\n",
        )
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
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
        runCli(
            "provider",
            "connection",
            "create",
            "anthropic",
            "anthropic-messages",
            "-u",
            "https://api.anthropic.com",
        )
        runCli(
            "model",
            "create",
            "anthropic",
            "claude-opus-5-5",
            "-n",
            "Claude Opus 5.5",
            "-a",
            "claude-opus-5-5",
        )
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
            defaultEmployeeId: "omar",
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
            defaultEmployeeId: "claude-senior",
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
                defaultEmployeeId: "omar",
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
            defaultEmployeeId: "claude-senior",
        })
        expect(await positionConfig("qa-tester")).toMatchObject({
            defaultEmployeeId: "claude-senior",
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
                "director   Director   (git users)\n" +
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

describe("llmco position update", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Dev", "-d", "Code.")
    })

    test("update -t changes the title and keeps the description", () => {
        const update = runCli("position", "update", "developer", "-t", "Lead")
        const show = runCli("position", "show", "developer").stdout

        expect(update.stdout).toBe('Updated position "developer".\n')
        expect(show).toBe("# Lead\n\ndefault employee: (vacant)\n\nCode.\n")
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
        expect(show).toBe("# Dev\n\ndefault employee: (vacant)\n\nCode.\n")
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })

    test("update-id keeps the default employee", () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("position", "assign", "developer", "omar")

        runCli("position", "update-id", "developer", "api-dev")

        const show = runCli("employee", "show", "omar").stdout
        expect(show).toContain("positions: api-dev\n")
    })

    test("update-id refuses an id another position has", () => {
        const update = runCli("position", "update-id", "developer", "qa-tester")
        const show = runCli("position", "show", "qa-tester").stdout

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('Position "qa-tester" already exists.')
        expect(show).toStartWith("# QA\n")
    })

    test("update-id rejects a new id that is not kebab-case", () => {
        const update = runCli("position", "update-id", "developer", "Dev")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("kebab-case")
    })

    test("update-id fails for an unknown position", () => {
        const update = runCli("position", "update-id", "designer", "ux")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('No position "designer".')
    })
})

describe("llmco position delete", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
    })

    test("delete removes the position", () => {
        const deletion = runCli("position", "delete", "developer")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toBe('Deleted position "developer".\n')
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })

    test("close is an alias of delete", () => {
        expect(runCli("position", "close", "developer").exitCode).toBe(0)
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })

    test("delete keeps the default employee hired", () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("position", "assign", "developer", "omar")

        const deletion = runCli("position", "delete", "developer")
        const show = runCli("employee", "show", "omar")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toContain('default employee "omar" stays hired')
        expect(show.stdout).toContain("positions: (none)")
    })

    test("delete fails for an unknown position", () => {
        const deletion = runCli("position", "delete", "qa-tester")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain('No position "qa-tester".')
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

    test("create records when the position was created", async () => {
        const before = Date.now()
        runCli("position", "create", "developer", "-t", "Developer")
        const after = Date.now()

        const created = Date.parse((await history("developer")).createdAt)

        expect(created).toBeGreaterThanOrEqual(before)
        expect(created).toBeLessThanOrEqual(after)
    })

    test("leaves the history out of config.json", async () => {
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "update-id", "developer", "api-developer")

        const path = projectPath(
            ".llmco",
            "positions",
            "api-developer",
            "config.json",
        )

        expect(await Bun.file(path).json()).toEqual({ title: "Developer" })
    })

    test("update-id starts a history for a position without one", async () => {
        const dir = projectPath(".llmco", "positions", "developer")
        await Bun.write(`${dir}/config.json`, '{ "title": "Developer" }')
        await Bun.write(`${dir}/description.md`, "")
        const before = await Bun.file(`${dir}/history.json`).exists()

        runCli("position", "update-id", "developer", "api-developer")
        const renamed = await history("api-developer")

        expect(before).toBe(false)
        expect(renamed.createdAt).toBeUndefined()
        expect(renamed.formerIds?.map(({ id }) => id)).toEqual(["developer"])
    })

    test("update-id records each former id and when it stopped", async () => {
        runCli("position", "create", "developer", "-t", "Developer")
        const created = await history("developer")

        const before = Date.now()
        runCli("position", "update-id", "developer", "api-developer")
        runCli("position", "update-id", "api-developer", "backend-developer")
        const after = Date.now()

        const renamed = await history("backend-developer")
        const formerIds = renamed.formerIds ?? []
        const ids = formerIds.map(({ id }) => id)
        const untils = formerIds.map(({ until }) => Date.parse(until))

        expect(created.formerIds).toBeUndefined()
        expect(renamed.createdAt).toBe(created.createdAt)
        expect(ids).toEqual(["developer", "api-developer"])
        expect(Math.min(...untils)).toBeGreaterThanOrEqual(before)
        expect(Math.max(...untils)).toBeLessThanOrEqual(after)
    })

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
