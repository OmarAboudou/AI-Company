import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { recordEvent } from "../../journal/record-event.ts"
import { loadJournal } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { UserError } from "../../user-error.ts"
import { createTask } from "../../work/task/create-task.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { hasEmployee, saveEmployee } from "../employee/storage.ts"
import { deletePosition } from "./delete-position.ts"
import { hasPosition, savePosition } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developer = { id: "developer", title: "Developer", description: "" }

async function askPosition(positionId: string): Promise<number> {
    const ticketNumber = 3
    const messageSentEvent = await recordEvent(
        await loadJournal(projectRoot),
        messageSentEventType,
        {
            depth: 0,
            ticketNumber,
            messageId: "20261019-100000-000-a1b2",
            positionId: "director",
        },
    )
    const uncreatedTask = {
        type: "example",
        positionId,
        params: { ticketNumber },
    }
    await createTask(
        await loadJournal(projectRoot),
        uncreatedTask,
        messageSentEvent,
    )
    return ticketNumber
}

describe("deletePosition", () => {
    test("deletes the position", async () => {
        await savePosition(projectRoot, developer)

        await deletePosition(projectRoot, "developer")

        expect(await hasPosition(projectRoot, "developer")).toBe(false)
    })

    test("keeps its employee hired, and returns it", async () => {
        const omar = {
            id: "omar",
            name: "Omar",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        } as const
        await saveEmployee(projectRoot, omar)
        const heldDeveloper = { ...developer, employeeId: "omar" }
        await savePosition(projectRoot, heldDeveloper)

        const { position } = await deletePosition(projectRoot, "developer")

        expect(position.employeeId).toBe("omar")
        expect(await hasEmployee(projectRoot, "omar")).toBe(true)
    })

    test("refuses the director's position", async () => {
        const deletion = deletePosition(projectRoot, "director")

        await expect(deletion).rejects.toThrow(UserError)
        await expect(deletion).rejects.toThrow("is the director's position")
        expect(await hasPosition(projectRoot, "director")).toBe(true)
    })

    test("refuses a position with pending tasks, naming their tickets", async () => {
        await savePosition(projectRoot, developer)
        const ticketNumber = await askPosition("developer")

        const deletion = deletePosition(projectRoot, "developer")

        await expect(deletion).rejects.toThrow(UserError)
        await expect(deletion).rejects.toThrow(
            `on these tickets: #${ticketNumber}.`,
        )
        await expect(deletion).rejects.toThrow("Add --force")
        expect(await hasPosition(projectRoot, "developer")).toBe(true)
    })

    test("deletes a position with pending tasks if forced, and returns their tickets", async () => {
        await savePosition(projectRoot, developer)
        const ticketNumber = await askPosition("developer")

        const forceOptions = { shouldForce: true }

        const deletion = await deletePosition(
            projectRoot,
            "developer",
            forceOptions,
        )

        expect(deletion.pendingTicketNumbers).toEqual([ticketNumber])
        expect(await hasPosition(projectRoot, "developer")).toBe(false)
    })

    test("refuses an unknown position", async () => {
        const deletion = deletePosition(projectRoot, "qa-tester")

        await expect(deletion).rejects.toThrow('No position "qa-tester".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const deletion = deletePosition(folderWithoutCompany, "developer")

        await expect(deletion).rejects.toThrow("Run `aico init` first.")
    })
})
