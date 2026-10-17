import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
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
    jobDescription: "You build the API.",
}

describe("savePosition", () => {
    test("writes config.json and job-description.md in a folder named after the id", async () => {
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
        expect(await Bun.file(join(dir, "job-description.md")).text()).toBe(
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

    test("rejects an invalid config.json", async () => {
        const dir = join(projectRoot, ".llmco", "positions", "developer")
        await Bun.write(join(dir, "config.json"), JSON.stringify({ title: "" }))
        await Bun.write(join(dir, "job-description.md"), "")

        await expect(loadPosition(projectRoot, "developer")).rejects.toThrow()
    })

    test("fails when the position does not exist", async () => {
        await expect(loadPosition(projectRoot, "developer")).rejects.toThrow()
    })
})

describe("positionExists", () => {
    test("is false before saving and true after", async () => {
        expect(await positionExists(projectRoot, "backend-developer")).toBe(
            false,
        )

        await savePosition(projectRoot, developer)

        expect(await positionExists(projectRoot, "backend-developer")).toBe(
            true,
        )
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
            jobDescription: "",
        }
        await savePosition(projectRoot, tester)
        await savePosition(projectRoot, developer)

        expect(await listPositions(projectRoot)).toEqual([developer, tester])
    })
})
