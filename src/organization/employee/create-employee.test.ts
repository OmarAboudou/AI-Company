import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { saveLlmModel } from "../../llm/model/storage.ts"
import { saveLlmProvider } from "../../llm/provider/storage.ts"
import { saveMessage } from "../../messaging/message/storage.ts"
import { saveThread } from "../../messaging/thread/storage.ts"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import { createEmployee } from "./create-employee.ts"
import { loadEmployee } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await saveLlmProvider(projectRoot, { id: "anthropic", name: "Anthropic" })
    await saveLlmModel(projectRoot, {
        providerId: "anthropic",
        id: "opus",
        name: "Claude Opus 5.5",
        apiId: "claude-opus-5-5",
        protocol: "anthropic-messages",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const omar = { name: "Omar", kind: "human" } as const
const claude = {
    name: "Claude",
    kind: "llm",
    providerId: "anthropic",
    modelId: "opus",
} as const

async function archiveMessageBy(employeeId: string) {
    const committer = { name: "Omar Aboudou", email: "omar@example.com" }
    const director = { id: "director", title: "Director" }
    const sentAt = "2026-10-18T14:01:00.000Z"
    const thread = { id: "2026-10-18-budget", subject: "Budget" }
    await saveThread(projectRoot, {
        ...thread,
        createdAt: sentAt,
        createdBy: { position: director, committer },
    })
    await saveMessage(projectRoot, {
        threadId: thread.id,
        id: "20261018-140100-000-0000",
        position: director,
        employee: { id: employeeId, name: "Earlier" },
        committer,
        mentions: [],
        sentAt,
        body: "Done.",
    })
}

describe("createEmployee", () => {
    test("saves a human employee with the date it was created", async () => {
        const before = Date.now()
        await createEmployee(projectRoot, "omar", omar)
        const after = Date.now()

        const employee = await loadEmployee(projectRoot, "omar")
        const createdTime = Date.parse(employee.createdAt ?? "")
        expect(employee).toMatchObject({ id: "omar", ...omar })
        expect(createdTime).toBeGreaterThanOrEqual(before)
        expect(createdTime).toBeLessThanOrEqual(after)
    })

    test("saves an LLM employee running on an existing model", async () => {
        const created = await createEmployee(projectRoot, "claude", claude)

        expect(await loadEmployee(projectRoot, "claude")).toEqual(created)
    })

    test("refuses an id another employee has", async () => {
        await createEmployee(projectRoot, "omar", omar)

        const creation = createEmployee(projectRoot, "omar", omar)

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow('"omar" already exists.')
    })

    test("refuses an id that is not kebab-case", async () => {
        const creation = createEmployee(projectRoot, "Omar", omar)

        await expect(creation).rejects.toThrow('Invalid employee id "Omar"')
    })

    test("refuses a blank name", async () => {
        const blank = { ...omar, name: " " }

        const creation = createEmployee(projectRoot, "omar", blank)

        await expect(creation).rejects.toThrow(UserError)
    })

    test("refuses an LLM employee on a model that doesn't exist", async () => {
        const onHaiku = { ...claude, modelId: "haiku" }

        const creation = createEmployee(projectRoot, "claude", onHaiku)

        await expect(creation).rejects.toThrow('has no model "haiku"')
    })

    test("refuses an id used before", async () => {
        await archiveMessageBy("omar")

        const creation = createEmployee(projectRoot, "omar", omar)

        await expect(creation).rejects.toThrow("add --reuse-id")
    })

    test("reuses an id used before when told to", async () => {
        await archiveMessageBy("omar")
        const reusing = { shouldReuseId: true }

        await createEmployee(projectRoot, "omar", omar, reusing)

        expect((await loadEmployee(projectRoot, "omar")).name).toBe("Omar")
    })

    test("names an existing employee before any earlier use", async () => {
        await createEmployee(projectRoot, "omar", omar)
        await archiveMessageBy("omar")

        const creation = createEmployee(projectRoot, "omar", omar)

        await expect(creation).rejects.toThrow('"omar" already exists.')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const creation = createEmployee(elsewhere, "omar", omar)

        await expect(creation).rejects.toThrow("Run `llmco init` first.")
    })
})
