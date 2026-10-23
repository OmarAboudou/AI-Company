import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { assignPositionTemporarily } from "../position/assign-position-temporarily.ts"
import { savePosition } from "../position/storage.ts"
import { setCurrentPosition } from "./set-current-position.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await savePosition(projectRoot, {
        id: "graphics",
        title: "Graphics",
        description: "",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("setCurrentPosition", () => {
    test("selects the director's position", async () => {
        const position = await setCurrentPosition(projectRoot, "director")

        expect(position.id).toBe("director")
    })

    test("selects a position assigned temporarily to the directors", async () => {
        await assignPositionTemporarily(projectRoot, "graphics", {
            kind: "directors",
        })

        const position = await setCurrentPosition(projectRoot, "graphics")

        expect(position.id).toBe("graphics")
    })

    test("refuses a position the directors don't work, saying how to", async () => {
        const selection = setCurrentPosition(projectRoot, "graphics")

        await expect(selection).rejects.toThrow(UserError)
        await expect(selection).rejects.toThrow("assign-temporarily directors")
    })

    test("refuses an unknown position", async () => {
        const selection = setCurrentPosition(projectRoot, "support")

        await expect(selection).rejects.toThrow('No position "support".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const selection = setCurrentPosition(folderWithoutCompany, "director")

        await expect(selection).rejects.toThrow("Run `aico init` first.")
    })
})
