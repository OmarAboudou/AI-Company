import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../errors.ts"
import {
    copyPosition,
    deletePosition,
    listPositions,
    loadPosition,
    loadPositionState,
    positionExists,
    savePosition,
    savePositionState,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developer = {
    id: "backend-developer",
    title: "Backend Developer",
    description: "You build the API.",
}

describe("savePosition", () => {
    test("writes config.json and description.md in a folder named after the id", async () => {
        await savePosition(projectRoot, developer)

        const dir = join(
            projectRoot,
            ".llmco",
            "positions",
            "backend-developer",
        )
        expect(await Bun.file(join(dir, "config.json")).text()).toBe(
            '{\n    "title": "Backend Developer"\n}\n',
        )
        expect(await Bun.file(join(dir, "description.md")).text()).toBe(
            "You build the API.",
        )
    })
})

describe("loadPosition", () => {
    test("reads back what savePosition wrote", async () => {
        await savePosition(projectRoot, developer)

        expect(await loadPosition(projectRoot, "backend-developer")).toEqual(
            developer,
        )
    })

    test("reads back the default employee", async () => {
        const filled = { ...developer, defaultEmployeeId: "claude-senior" }
        await savePosition(projectRoot, filled)

        expect(await loadPosition(projectRoot, "backend-developer")).toEqual(
            filled,
        )
    })

    test("rejects an invalid config.json", async () => {
        const dir = join(projectRoot, ".llmco", "positions", "developer")
        await Bun.write(join(dir, "config.json"), JSON.stringify({ title: "" }))
        await Bun.write(join(dir, "description.md"), "")

        await expect(loadPosition(projectRoot, "developer")).rejects.toThrow(
            UserError,
        )
    })

    test("fails when the position does not exist", async () => {
        await expect(loadPosition(projectRoot, "developer")).rejects.toThrow(
            UserError,
        )
    })
})

describe("positionExists", () => {
    test("is false before saving and true after", async () => {
        expect(await positionExists(projectRoot, developer.id)).toBe(false)

        await savePosition(projectRoot, developer)

        expect(await positionExists(projectRoot, developer.id)).toBe(true)
    })
})

describe("listPositions", () => {
    test("is empty when no position was ever created", async () => {
        expect(await listPositions(projectRoot)).toEqual([])
    })

    test("returns every position sorted by id", async () => {
        const tester = {
            id: "qa-tester",
            title: "QA Tester",
            description: "",
        }
        await savePosition(projectRoot, tester)
        await savePosition(projectRoot, developer)

        expect(await listPositions(projectRoot)).toEqual([developer, tester])
    })
})

describe("deletePosition", () => {
    test("removes the position's folder", async () => {
        await savePosition(projectRoot, developer)
        const before = await listPositions(projectRoot)

        await deletePosition(projectRoot, developer.id)
        const after = await listPositions(projectRoot)

        expect(before).toEqual([developer])
        expect(after).toEqual([])
    })
})

describe("copyPosition", () => {
    test("copies the position's folder under its new id", async () => {
        await savePosition(projectRoot, developer)
        const before = await listPositions(projectRoot)

        await copyPosition(projectRoot, developer.id, "api-developer")
        const after = await listPositions(projectRoot)

        expect(before).toEqual([developer])
        expect(after).toEqual([
            { ...developer, id: "api-developer" },
            developer,
        ])
    })
})

function statePath(...segments: string[]): string {
    return join(projectRoot, ".llmco", ".state", ...segments)
}

describe("savePositionState", () => {
    const interim = {
        temporaryAssignment: { kind: "employee", employeeId: "julie" },
    } as const

    test("writes the state in .llmco/.state/positions, named after the id", async () => {
        await savePositionState(projectRoot, developer.id, interim)

        const file = Bun.file(statePath("positions", `${developer.id}.json`))
        expect(await file.json()).toEqual(interim)
    })

    test("writes a .gitignore ignoring the whole state folder", async () => {
        await savePositionState(projectRoot, developer.id, interim)

        const gitignore = await Bun.file(statePath(".gitignore")).text()
        expect(gitignore.split("\n")).toContain("*")
    })

    test("leaves nothing for git to commit", async () => {
        Bun.spawnSync(["git", "init", "-q"], { cwd: projectRoot })

        await savePositionState(projectRoot, developer.id, interim)

        const status = Bun.spawnSync(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            { cwd: projectRoot },
        )
        expect(status.stdout.toString()).toBe("")
    })

    test("removes the file of an empty state", async () => {
        const path = statePath("positions", `${developer.id}.json`)
        await savePositionState(projectRoot, developer.id, interim)
        const before = await Bun.file(path).exists()

        await savePositionState(projectRoot, developer.id, {})
        const after = await Bun.file(path).exists()

        expect(before).toBe(true)
        expect(after).toBe(false)
    })
})

describe("loadPositionState", () => {
    test("reads back what savePositionState wrote", async () => {
        const directors = {
            temporaryAssignment: { kind: "directors" },
        } as const
        await savePositionState(projectRoot, developer.id, directors)

        const state = await loadPositionState(projectRoot, developer.id)

        expect(state).toEqual(directors)
    })

    test("is empty when the position has no state", async () => {
        expect(await loadPositionState(projectRoot, developer.id)).toEqual({})
    })

    test("rejects an invalid state file", async () => {
        const path = statePath("positions", `${developer.id}.json`)
        await Bun.write(path, JSON.stringify({ temporaryAssignment: {} }))

        const load = loadPositionState(projectRoot, developer.id)

        await expect(load).rejects.toThrow(UserError)
    })
})
