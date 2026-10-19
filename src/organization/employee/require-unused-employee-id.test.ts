import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createTemporaryCompany } from "../../company/create-temporary-company.ts"
import { saveMessage } from "../../message/storage.ts"
import { saveThread } from "../../thread/storage.ts"
import { UserError } from "../../user-error.ts"
import { requireUnusedEmployeeId } from "./require-unused-employee-id.ts"
import { saveEmployee } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const threadId = "2026-10-18-budget"

async function archiveMessageBy(employeeId: string, sentAt: string) {
    const committer = { name: "Omar Aboudou", email: "omar@example.com" }
    await saveThread(projectRoot, {
        id: threadId,
        subject: "Budget",
        createdAt: "2026-10-18T14:00:00.000Z",
        createdBy: {
            position: { id: "director", title: "Director" },
            committer,
        },
    })
    await saveMessage(projectRoot, {
        threadId,
        id: "20261018-140100-000-0000",
        position: { id: "developer", title: "Developer" },
        employee: { id: employeeId, name: "Earlier" },
        committer,
        mentions: [],
        sentAt,
        body: "Done.",
    })
}

describe("requireUnusedEmployeeId", () => {
    test("accepts an id nobody used", async () => {
        const check = requireUnusedEmployeeId(projectRoot, "claude")

        await expect(check).resolves.toBeUndefined()
    })

    test("refuses an id an earlier employee wrote under", async () => {
        await archiveMessageBy("claude", "2026-10-18T14:01:00.000Z")

        const check = requireUnusedEmployeeId(projectRoot, "claude")

        await expect(check).rejects.toThrow(UserError)
        await expect(check).rejects.toThrow(`in thread "${threadId}".`)
        await expect(check).rejects.toThrow("add --reuse-id")
    })

    test("refuses another employee's former id", async () => {
        const formerIds = [{ id: "omar", until: "2026-10-19T09:00:00.000Z" }]
        const omar = { id: "omar-a", name: "Omar", kind: "human" } as const
        await saveEmployee(projectRoot, { ...omar, formerIds })

        const check = requireUnusedEmployeeId(projectRoot, "omar")

        await expect(check).rejects.toThrow('former id of employee "omar-a"')
    })

    test("accepts an id used before when told to reuse it", async () => {
        await archiveMessageBy("claude", "2026-10-18T14:01:00.000Z")
        const reusing = { shouldReuseId: true }

        const check = requireUnusedEmployeeId(projectRoot, "claude", reusing)

        await expect(check).resolves.toBeUndefined()
    })

    test("gives an employee back its own former id", async () => {
        await archiveMessageBy("omar", "2026-10-18T14:01:00.000Z")
        const formerIds = [{ id: "omar", until: "2026-10-19T09:00:00.000Z" }]
        const omar = { id: "omar-a", name: "Omar", kind: "human" } as const
        const renamedEmployee = { ...omar, formerIds }
        await saveEmployee(projectRoot, renamedEmployee)

        const check = requireUnusedEmployeeId(projectRoot, "omar", {
            renamedEmployee,
        })

        await expect(check).resolves.toBeUndefined()
    })
})
