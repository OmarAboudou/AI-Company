import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { saveEmployee } from "../employee/storage.ts"
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

    test("selects a position no employee holds", async () => {
        const position = await setCurrentPosition(projectRoot, "graphics")

        expect(position.id).toBe("graphics")
    })

    test("refuses a position an LLM employee holds, saying how to take it back", async () => {
        await Promise.all([
            saveEmployee(projectRoot, {
                id: "claude",
                name: "Claude Senior",
                kind: "llm",
                providerId: "anthropic",
                modelId: "opus",
            }),
            savePosition(projectRoot, {
                id: "graphics",
                title: "Graphics",
                description: "",
                employeeId: "claude",
            }),
        ])

        const selection = setCurrentPosition(projectRoot, "graphics")

        await expect(selection).rejects.toThrow(UserError)
        await expect(selection).rejects.toThrow(
            "Claude Senior, an LLM employee, holds it",
        )
        await expect(selection).rejects.toThrow(
            "`aico position unassign graphics`",
        )
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
