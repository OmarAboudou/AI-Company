import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../errors.ts"
import {
    deletePosition,
    listPositions,
    loadPosition,
    positionExists,
    savePosition,
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

        await deletePosition(projectRoot, developer.id)

        expect(await listPositions(projectRoot)).toEqual([])
    })
})
