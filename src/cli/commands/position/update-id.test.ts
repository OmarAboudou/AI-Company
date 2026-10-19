import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

type History = {
    createdAt: string
    formerIds?: { id: string; until: string }[]
}

const { runCli, projectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

function positionStatePath(id: string): string {
    return projectPath(".llmco", ".state", "positions", `${id}.json`)
}

async function positionState(id: string): Promise<unknown> {
    const file = Bun.file(positionStatePath(id))
    return (await file.exists()) ? file.json() : undefined
}

describe("a temporary assignment through the position's lifecycle", () => {
    const julie = {
        temporaryAssignment: { kind: "employee", employeeId: "julie" },
    }

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli(...interimEmployee, "developer", "julie")
    })

    test("update-id moves the state with the position", async () => {
        const before = await positionState("developer")

        runCli("position", "update-id", "developer", "api-developer")

        expect(before).toEqual(julie)
        expect(await positionState("developer")).toBeUndefined()
        expect(await positionState("api-developer")).toEqual(julie)
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
        expect(show).toBe(
            "# Dev\n\ncurrent employee: (vacant)\ndefault employee: (none)\n\nCode.\n",
        )
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

describe("a position's id history", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    async function history(id: string): Promise<History> {
        const path = projectPath(".llmco", "positions", id, "history.json")
        const { createdAt, formerIds } = await Bun.file(path).json()
        return { createdAt, formerIds }
    }

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
})
