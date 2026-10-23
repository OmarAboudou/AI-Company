import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import {
    copyPositionFolder,
    deletePositionFolder,
    hasPosition,
    listPositions,
    loadPosition,
    savePosition,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
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

        const positionFolderPath = join(
            projectRoot,
            ".aico",
            "positions",
            "backend-developer",
        )
        const [configText, descriptionText] = await Promise.all([
            Bun.file(join(positionFolderPath, "config.json")).text(),
            Bun.file(join(positionFolderPath, "description.md")).text(),
        ])

        expect(configText).toBe('{\n    "title": "Backend Developer"\n}\n')
        expect(descriptionText).toBe("You build the API.")
    })

    test("writes the id history to history.json, out of config.json", async () => {
        const createdAt = "2026-10-18T14:00:00.000Z"
        const formerIds = [{ id: "dev", until: "2026-10-19T09:00:00.000Z" }]

        await savePosition(projectRoot, { ...developer, createdAt, formerIds })

        const positionFolderPath = join(
            projectRoot,
            ".aico",
            "positions",
            developer.id,
        )
        const [config, history] = await Promise.all([
            Bun.file(join(positionFolderPath, "config.json")).json(),
            Bun.file(join(positionFolderPath, "history.json")).json(),
        ])
        expect(config).toEqual({ title: "Backend Developer" })
        expect(history).toEqual({ createdAt, formerIds })
    })
})

describe("loadPosition", () => {
    test("reads back what savePosition wrote", async () => {
        await savePosition(projectRoot, developer)

        const loadedPosition = await loadPosition(projectRoot, developer.id)

        expect(loadedPosition).toEqual(developer)
    })

    test("reads back the employee holding the position", async () => {
        const heldDeveloper = { ...developer, employeeId: "claude-senior" }
        await savePosition(projectRoot, heldDeveloper)

        const loadedPosition = await loadPosition(projectRoot, developer.id)

        expect(loadedPosition).toEqual(heldDeveloper)
    })

    test("rejects an invalid config.json", async () => {
        const positionFolderPath = join(
            projectRoot,
            ".aico",
            "positions",
            "developer",
        )
        await Bun.write(
            join(positionFolderPath, "config.json"),
            JSON.stringify({ title: "" }),
        )
        await Bun.write(join(positionFolderPath, "description.md"), "")

        const loading = loadPosition(projectRoot, "developer")

        await expect(loading).rejects.toThrow(UserError)
    })

    test("fails when the position does not exist", async () => {
        const loading = loadPosition(projectRoot, "developer")

        await expect(loading).rejects.toThrow(UserError)
    })
})

describe("hasPosition", () => {
    test("is false before saving and true after", async () => {
        expect(await hasPosition(projectRoot, developer.id)).toBe(false)

        await savePosition(projectRoot, developer)

        expect(await hasPosition(projectRoot, developer.id)).toBe(true)
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

describe("deletePositionFolder", () => {
    test("removes the position's folder", async () => {
        await savePosition(projectRoot, developer)
        const before = await listPositions(projectRoot)

        await deletePositionFolder(projectRoot, developer.id)
        const after = await listPositions(projectRoot)

        expect(before).toEqual([developer])
        expect(after).toEqual([])
    })
})

describe("copyPositionFolder", () => {
    test("copies the position's folder under its new id", async () => {
        await savePosition(projectRoot, developer)
        const before = await listPositions(projectRoot)

        await copyPositionFolder(projectRoot, developer.id, "api-developer")
        const after = await listPositions(projectRoot)

        expect(before).toEqual([developer])
        expect(after).toEqual([
            { ...developer, id: "api-developer" },
            developer,
        ])
    })
})
