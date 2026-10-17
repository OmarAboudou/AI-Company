import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cliPath = join(import.meta.dir, "cli.ts")

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function runCli(...args: string[]) {
    return runCliWithStdin("", ...args)
}

function runCliWithStdin(stdin: string, ...args: string[]) {
    const result = Bun.spawnSync([process.execPath, cliPath, ...args], {
        cwd: projectRoot,
        stdin: new TextEncoder().encode(stdin),
    })
    return {
        exitCode: result.exitCode,
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
    }
}

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
            "# Backend Developer\n\nemployee: (vacant)\n\nYou build the API.\n",
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

describe("llmco employee", () => {
    beforeEach(() => {
        runCli("init", "--name", "Acme")
    })

    function createClaude() {
        return runCli(
            "employee",
            "create",
            "llm",
            "claude-senior",
            "--name",
            "Claude Senior",
            "--provider",
            "anthropic",
            "--model",
            "claude-opus-5-5",
        )
    }

    test("create llm then show displays the provider and model", () => {
        expect(createClaude().exitCode).toBe(0)

        const show = runCli("employee", "show", "claude-senior")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            "# Claude Senior\n\nkind: llm\nprovider: anthropic\nmodel: claude-opus-5-5\npositions: (none)\n",
        )
    })

    test("hire is an alias of create", () => {
        const hire = runCli("employee", "hire", "human", "omar", "-n", "Omar")
        expect(hire.exitCode).toBe(0)

        expect(runCli("employee", "show", "omar").stdout).toBe(
            "# Omar\n\nkind: human\npositions: (none)\n",
        )
    })

    test("list aligns names, models and positions after the ids, sorted by id", () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar Aboudou")
        createClaude()

        expect(runCli("employee", "list").stdout).toBe(
            "claude-senior  Claude Senior  anthropic/claude-opus-5-5  (none)\n" +
                "omar           Omar Aboudou   human                      (none)\n",
        )
    })

    test("list says so when there is no employee", () => {
        const list = runCli("employee", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No employees yet.")
    })

    test("create refuses an existing id", () => {
        createClaude()

        const second = runCli(
            "employee",
            "create",
            "human",
            "claude-senior",
            "-n",
            "X",
        )

        expect(second.exitCode).toBe(1)
        expect(runCli("employee", "show", "claude-senior").stdout).toContain(
            "# Claude Senior",
        )
    })

    test("create llm requires a provider and a model", () => {
        expect(
            runCli(
                "employee",
                "create",
                "llm",
                "x",
                "-n",
                "X",
                "-p",
                "anthropic",
            ).exitCode,
        ).toBe(1)
        expect(
            runCli(
                "employee",
                "create",
                "llm",
                "x",
                "-n",
                "X",
                "-m",
                "claude-opus-5-5",
            ).exitCode,
        ).toBe(1)
    })

    test("create llm rejects a model id that is not kebab-case", () => {
        const create = runCli(
            "employee",
            "create",
            "llm",
            "local",
            "-n",
            "Local",
            "-p",
            "ollama",
            "-m",
            "llama3.1:8b",
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("kebab-case")
        expect(create.stderr).toContain("at model")
    })

    test("create human rejects a model", () => {
        const create = runCli(
            "employee",
            "create",
            "human",
            "omar",
            "-n",
            "Omar",
            "-m",
            "x",
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("unknown option '-m'")
    })

    test("create requires the kind before the id", () => {
        const create = runCli("employee", "create", "omar", "-n", "Omar")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("unknown command 'omar'")
    })

    test("show fails for an unknown employee", () => {
        expect(runCli("employee", "show", "omar").exitCode).toBe(1)
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
        const path = join(projectRoot, ".llmco", "positions", id, "config.json")
        return Bun.file(path).json()
    }

    test("assign fills a vacant position", async () => {
        const assign = runCli("position", "assign", "developer", "omar")

        expect(assign.exitCode).toBe(0)
        expect(assign.stdout).toBe('Assigned "omar" to position "developer".\n')
        expect(await positionConfig("developer")).toEqual({
            title: "Developer",
            employee: "omar",
        })
    })

    test("assign refuses a filled position without --replace", async () => {
        runCli("position", "assign", "developer", "claude-senior")

        const assign = runCli("position", "assign", "developer", "omar")

        expect(assign.exitCode).toBe(1)
        expect(assign.stderr).toContain('already filled by "claude-senior"')
        expect(assign.stderr).toContain("--replace")
        expect(await positionConfig("developer")).toEqual({
            title: "Developer",
            employee: "claude-senior",
        })
    })

    test.each(["--replace", "-r"])(
        "assign %s replaces the employee",
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
                'Replaced "claude-senior" with "omar" on position "developer".\n',
            )
            expect(await positionConfig("developer")).toEqual({
                title: "Developer",
                employee: "omar",
            })
        },
    )

    test("assign accepts the employee already filling the position", () => {
        runCli("position", "assign", "developer", "omar")

        const again = runCli("position", "assign", "developer", "omar")

        expect(again.exitCode).toBe(0)
        expect(again.stdout).toContain("already fills")
    })

    test("one employee can fill several positions", async () => {
        runCli("position", "assign", "developer", "claude-senior")
        runCli("position", "assign", "qa-tester", "claude-senior")

        expect(await positionConfig("developer")).toMatchObject({
            employee: "claude-senior",
        })
        expect(await positionConfig("qa-tester")).toMatchObject({
            employee: "claude-senior",
        })
    })

    test("assign fails for an unknown position or employee", () => {
        expect(runCli("position", "assign", "designer", "omar").exitCode).toBe(
            1,
        )
        expect(runCli("position", "assign", "developer", "bob").exitCode).toBe(
            1,
        )
    })

    test("unassign makes the position vacant", async () => {
        runCli("position", "assign", "developer", "omar")

        const unassign = runCli("position", "unassign", "developer")

        expect(unassign.exitCode).toBe(0)
        expect(unassign.stdout).toContain('"omar" no longer fills it')
        expect(await positionConfig("developer")).toEqual({
            title: "Developer",
        })
    })

    test("list and show display the employee filling the position", () => {
        runCli("position", "assign", "qa-tester", "claude-senior")

        expect(runCli("position", "list").stdout).toBe(
            "developer  Developer  (vacant)\n" +
                "qa-tester  QA Tester  claude-senior\n",
        )
        expect(runCli("position", "show", "qa-tester").stdout).toBe(
            "# QA Tester\n\nemployee: claude-senior\n\n\n",
        )
    })

    test("employee list and show display the positions filled", () => {
        runCli("position", "assign", "developer", "claude-senior")
        runCli("position", "assign", "qa-tester", "claude-senior")

        expect(runCli("employee", "list").stdout).toBe(
            "claude-senior  Claude Senior  anthropic/claude-opus-5-5  developer, qa-tester\n" +
                "omar           Omar           human                      (none)\n",
        )
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

    test("init reads the description from a file", async () => {
        await Bun.write(join(projectRoot, "company.md"), markdown)

        runCli("init", "--name", "Acme", "--description-file", "company.md")

        expect(runCli("company", "show").stdout).toBe(`# Acme\n\n${markdown}\n`)
    })

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
            `# Developer\n\nemployee: (vacant)\n\n${markdown}\n`,
        )
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
            "# Developer\n\nemployee: (vacant)\n\nYou build the API.\n",
        )
    })

    test("-F reads the description from a file", async () => {
        await Bun.write(join(projectRoot, "company.md"), "We build things.")

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
            join(projectRoot, ".llmco", "company", "config.json"),
            '{ "name": "" }',
        )

        const show = runCli("company", "show")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toStartWith("Invalid .llmco/company/config.json:")
        expect(show.stderr).toContain("at name")
    })

    test("position list names the broken position file", async () => {
        runCli("init", "--name", "Acme")
        runCli("position", "create", "developer", "--title", "Developer")
        await Bun.write(
            join(
                projectRoot,
                ".llmco",
                "positions",
                "developer",
                "config.json",
            ),
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

test("employee commands require a company", () => {
    expect(runCli("employee", "list").exitCode).toBe(1)
})

test.each([
    ["position", "create", ".llmco/positions"],
    ["employee", "show", ".llmco/employees"],
])("%s %s --help says the id names a folder in %s", (group, command, dir) => {
    const help = runCli(group, command, "--help").stdout
    const unwrapped = help.replace(/\s+/g, " ")

    expect(unwrapped).toContain(`the name of its folder in ${dir}`)
})

test("prints the --help output for an unknown command", () => {
    const help = runCli("--help")
    const result = runCli("unknown")

    expect(help.exitCode).toBe(0)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain(help.stdout)
})
