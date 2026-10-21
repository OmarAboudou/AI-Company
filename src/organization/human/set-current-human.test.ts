import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { saveEmployee } from "../employee/storage.ts"
import { setCurrentHuman } from "./set-current-human.ts"

const julie = { id: "julie", name: "Julie", kind: "human" } as const
let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveEmployee(projectRoot, julie),
        saveEmployee(projectRoot, {
            id: "claude",
            name: "Claude",
            kind: "llm",
            providerId: "anthropic",
            modelId: "claude-opus-5-5",
        }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("setCurrentHuman", () => {
    test("switches to the human employee the id names", async () => {
        const currentHuman = await setCurrentHuman(projectRoot, "julie")

        expect(currentHuman).toEqual({ kind: "employee", employee: julie })
    })

    test("refuses an LLM employee", async () => {
        const switching = setCurrentHuman(projectRoot, "claude")

        await expect(switching).rejects.toThrow(UserError)
        await expect(switching).rejects.toThrow('"claude" is an LLM employee')
    })

    test("refuses an id naming no employee", async () => {
        const switching = setCurrentHuman(projectRoot, "eve")

        await expect(switching).rejects.toThrow('No employee "eve".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const switching = setCurrentHuman(folderWithoutCompany, "julie")

        await expect(switching).rejects.toThrow("Run `llmco init` first.")
    })
})
