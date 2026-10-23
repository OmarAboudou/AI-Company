import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import { savePosition } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("loadExistingPosition", () => {
    test("loads the position the id names", async () => {
        const developer = {
            id: "developer",
            title: "Developer",
            description: "",
        }
        await savePosition(projectRoot, developer)

        const position = await loadExistingPosition(projectRoot, "developer")

        expect(position).toEqual(developer)
    })

    test("refuses an unknown position, saying how to list them", async () => {
        const refusalMessage =
            'No position "developer". Run `aico position list`.'

        const loading = loadExistingPosition(projectRoot, "developer")

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow(refusalMessage)
    })

    test("refuses an id that is not kebab-case", async () => {
        const loading = loadExistingPosition(projectRoot, "Developer")

        await expect(loading).rejects.toThrow('Invalid position id "Developer"')
    })
})
