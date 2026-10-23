import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { saveMessage } from "../../messaging/message/storage.ts"
import { saveNewTicket } from "../../messaging/ticket/storage.ts"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { requireUnusedEmployeeId } from "./require-unused-employee-id.ts"
import { saveEmployee } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const committer = { name: "Omar Aboudou", email: "omar@example.com" }

const budgetTicket = {
    number: 1,
    title: "Budget",
    requester: { id: "founder", title: "Founder" },
    assignee: { id: "developer", title: "Developer" },
    committer,
    createdAt: "2026-10-18T14:00:00.000Z",
    request: "How much?",
}

async function archiveMessageBy(employeeId: string, sentAt: string) {
    await saveNewTicket(projectRoot, budgetTicket)
    await saveMessage(projectRoot, {
        ticketNumber: budgetTicket.number,
        id: "20261018-140100-000-0000",
        position: { id: "developer", title: "Developer" },
        employee: { id: employeeId, name: "Earlier" },
        committer,
        sentAt,
        body: "Done.",
    })
}

describe("requireUnusedEmployeeId", () => {
    test("accepts an id nobody used", async () => {
        const checking = requireUnusedEmployeeId(projectRoot, "claude")

        await expect(checking).resolves.toBeUndefined()
    })

    test("refuses an id an earlier employee wrote under", async () => {
        await archiveMessageBy("claude", "2026-10-18T14:01:00.000Z")

        const checking = requireUnusedEmployeeId(projectRoot, "claude")

        await expect(checking).rejects.toThrow(UserError)
        await expect(checking).rejects.toThrow("in ticket #1.")
        await expect(checking).rejects.toThrow("add --reuse-id")
    })

    test("refuses an id an earlier employee created a ticket under", async () => {
        const employee = { id: "claude", name: "Earlier" }
        await saveNewTicket(projectRoot, { ...budgetTicket, employee })

        const checking = requireUnusedEmployeeId(projectRoot, "claude")

        await expect(checking).rejects.toThrow("in ticket #1.")
    })

    test("refuses another employee's former id", async () => {
        const formerIds = [{ id: "omar", until: "2026-10-19T09:00:00.000Z" }]
        const omar = {
            id: "omar-a",
            name: "Omar",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        } as const
        await saveEmployee(projectRoot, { ...omar, formerIds })

        const checking = requireUnusedEmployeeId(projectRoot, "omar")

        await expect(checking).rejects.toThrow('former id of employee "omar-a"')
    })

    test("accepts an id used before when told to reuse it", async () => {
        await archiveMessageBy("claude", "2026-10-18T14:01:00.000Z")
        const reuseOptions = { shouldReuseId: true }

        const checking = requireUnusedEmployeeId(
            projectRoot,
            "claude",
            reuseOptions,
        )

        await expect(checking).resolves.toBeUndefined()
    })

    test("gives an employee back its own former id", async () => {
        await archiveMessageBy("omar", "2026-10-18T14:01:00.000Z")
        const formerIds = [{ id: "omar", until: "2026-10-19T09:00:00.000Z" }]
        const omar = {
            id: "omar-a",
            name: "Omar",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        } as const
        const renamedEmployee = { ...omar, formerIds }
        await saveEmployee(projectRoot, renamedEmployee)

        const checking = requireUnusedEmployeeId(projectRoot, "omar", {
            renamedEmployee,
        })

        await expect(checking).resolves.toBeUndefined()
    })
})
