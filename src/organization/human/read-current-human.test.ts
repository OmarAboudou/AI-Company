import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import { saveEmployee } from "../employee/storage.ts"
import { readCurrentHuman } from "./read-current-human.ts"

const variable = "LLMCO_CURRENT_HUMAN_ID"
const shellValue = process.env[variable]
const julie = { id: "julie", name: "Julie", kind: "human" } as const
let projectRoot: string

beforeEach(async () => {
    delete process.env[variable]
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
    if (shellValue === undefined) {
        delete process.env[variable]
    } else {
        process.env[variable] = shellValue
    }
    await rm(projectRoot, { recursive: true, force: true })
})

describe("readCurrentHuman", () => {
    test("is a director without LLMCO_CURRENT_HUMAN_ID", async () => {
        const human = await readCurrentHuman(projectRoot)

        expect(human).toEqual({ kind: "director" })
    })

    test("is the human employee LLMCO_CURRENT_HUMAN_ID names", async () => {
        process.env[variable] = "julie"

        const human = await readCurrentHuman(projectRoot)

        expect(human).toEqual({ kind: "employee", employee: julie })
    })

    test("refuses an id that names no employee", async () => {
        process.env[variable] = "bob"

        const reading = readCurrentHuman(projectRoot)

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow('names no employee: "bob"')
    })

    test("refuses an LLM employee", async () => {
        process.env[variable] = "claude"

        const reading = readCurrentHuman(projectRoot)

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow("an LLM employee")
    })
})
