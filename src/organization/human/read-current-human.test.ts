import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import { saveEmployee } from "../employee/storage.ts"
import { readCurrentHuman } from "./read-current-human.ts"

const julie = { id: "julie", name: "Julie", kind: "human" } as const
let environment: NodeJS.ProcessEnv
let projectRoot: string

beforeEach(async () => {
    environment = {}
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveEmployee(projectRoot, {
            id: "julie",
            name: "Julie",
            kind: "human",
        }),
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

describe("readCurrentHuman", () => {
    test("is a director without LLMCO_CURRENT_HUMAN_ID", async () => {
        const currentHuman = await readCurrentHuman(projectRoot, environment)

        expect(currentHuman).toEqual({ kind: "director" })
    })

    test("is the human employee LLMCO_CURRENT_HUMAN_ID names", async () => {
        environment.LLMCO_CURRENT_HUMAN_ID = "julie"

        const currentHuman = await readCurrentHuman(projectRoot, environment)

        expect(currentHuman).toEqual({ kind: "employee", employee: julie })
    })

    test("refuses an id that names no employee", async () => {
        environment.LLMCO_CURRENT_HUMAN_ID = "bob"

        const reading = readCurrentHuman(projectRoot, environment)

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow('names no employee: "bob"')
    })

    test("refuses an LLM employee", async () => {
        environment.LLMCO_CURRENT_HUMAN_ID = "claude"

        const reading = readCurrentHuman(projectRoot, environment)

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow("an LLM employee")
    })
})
