import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { recordEvent } from "../../journal/record-event.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { UserError } from "../../user-error.ts"
import { createTask } from "../../work/task/create-task.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import { hasEmployee, saveEmployee } from "../employee/storage.ts"
import { deletePosition } from "./delete-position.ts"
import {
    hasPosition,
    loadPositionState,
    savePosition,
    savePositionState,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developer = { id: "developer", title: "Developer", description: "" }

async function askPosition(positionId: string): Promise<string> {
    const threadId = "2026-10-19-release"
    const messageSentEvent = await recordEvent(
        projectRoot,
        messageSentEventType,
        {
            depth: 0,
            threadId,
            messageId: "20261019-100000-000-a1b2",
            mentions: [positionId],
        },
    )
    const uncreatedTask = {
        type: "catch-up-thread",
        positionId,
        params: { threadId },
    }
    await createTask(projectRoot, uncreatedTask, messageSentEvent)
    return threadId
}

describe("deletePosition", () => {
    test("deletes the position and its state", async () => {
        const directors = {
            temporaryAssignment: { kind: "directors" },
        } as const
        await savePosition(projectRoot, developer)
        await savePositionState(projectRoot, "developer", directors)
        const before = await loadPositionState(projectRoot, "developer")

        await deletePosition(projectRoot, "developer")

        expect(before).toEqual(directors)
        expect(await hasPosition(projectRoot, "developer")).toBe(false)
        expect(await loadPositionState(projectRoot, "developer")).toEqual({})
    })

    test("keeps its default employee hired, and returns it", async () => {
        const omar = { id: "omar", name: "Omar", kind: "human" } as const
        await saveEmployee(projectRoot, omar)
        const filledDeveloper = { ...developer, defaultEmployeeId: "omar" }
        await savePosition(projectRoot, filledDeveloper)

        const { position } = await deletePosition(projectRoot, "developer")

        expect(position.defaultEmployeeId).toBe("omar")
        expect(await hasEmployee(projectRoot, "omar")).toBe(true)
    })

    test("refuses the director's position", async () => {
        const deletion = deletePosition(projectRoot, "director")

        await expect(deletion).rejects.toThrow(UserError)
        await expect(deletion).rejects.toThrow("is the director's position")
        expect(await hasPosition(projectRoot, "director")).toBe(true)
    })

    test("refuses a position with pending tasks, naming their threads", async () => {
        await savePosition(projectRoot, developer)
        const threadId = await askPosition("developer")

        const deletion = deletePosition(projectRoot, "developer")

        await expect(deletion).rejects.toThrow(UserError)
        await expect(deletion).rejects.toThrow(`in these threads: ${threadId}.`)
        await expect(deletion).rejects.toThrow("Add --force")
        expect(await hasPosition(projectRoot, "developer")).toBe(true)
    })

    test("deletes a position with pending tasks if forced, and returns their threads", async () => {
        await savePosition(projectRoot, developer)
        const threadId = await askPosition("developer")

        const forceOptions = { shouldForce: true }

        const deletion = await deletePosition(
            projectRoot,
            "developer",
            forceOptions,
        )

        expect(deletion.pendingThreadIds).toEqual([threadId])
        expect(await hasPosition(projectRoot, "developer")).toBe(false)
    })

    test("refuses an unknown position", async () => {
        const deletion = deletePosition(projectRoot, "qa-tester")

        await expect(deletion).rejects.toThrow('No position "qa-tester".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const deletion = deletePosition(folderWithoutCompany, "developer")

        await expect(deletion).rejects.toThrow("Run `llmco init` first.")
    })
})
