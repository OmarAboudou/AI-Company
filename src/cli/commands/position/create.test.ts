import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

type History = {
    createdAt: string
    formerIds?: { id: string; until: string }[]
}

const { runCli, runCliWithStdin, projectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

function positionStatePath(id: string): string {
    return projectPath(".llmco", ".state", "positions", `${id}.json`)
}

async function positionState(id: string): Promise<unknown> {
    const file = Bun.file(positionStatePath(id))
    return (await file.exists()) ? file.json() : undefined
}

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
            "# Backend Developer\n\ncurrent employee: (vacant)\ndefault employee: (none)\n\nYou build the API.\n",
        )
    })

    test("open is an alias of create", () => {
        const open = runCli("position", "open", "developer", "-t", "Developer")
        const show = runCli("position", "show", "developer").stdout

        expect(open.exitCode).toBe(0)
        expect(show).toContain("# Developer")
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
})

describe("a temporary assignment through the position's lifecycle", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli(...interimEmployee, "developer", "julie")
    })

    test("create ignores a state left behind by another position", async () => {
        const state = { temporaryAssignment: { kind: "directors" } }
        await Bun.write(positionStatePath("tester"), JSON.stringify(state))
        const before = await positionState("tester")

        runCli("position", "create", "tester", "-t", "Tester")

        expect(before).toEqual(state)
        expect(await positionState("tester")).toBeUndefined()
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
            `# Developer\n\ncurrent employee: (vacant)\ndefault employee: (none)\n\n${markdown}\n`,
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
})
