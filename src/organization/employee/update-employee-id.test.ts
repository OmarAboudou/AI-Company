import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { saveMessage } from "../../message/storage.ts"
import { saveThread } from "../../thread/storage.ts"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.ts"
import {
    loadPosition,
    loadPositionState,
    savePosition,
    savePositionState,
} from "../position/storage.ts"
import { hasEmployee, loadEmployee, saveEmployee } from "./storage.ts"
import { updateEmployeeId } from "./update-employee-id.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveEmployee(projectRoot, omar),
        saveEmployee(projectRoot, {
            id: "julie",
            name: "Julie",
            kind: "human",
        }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const omar = {
    id: "omar",
    name: "Omar",
    kind: "human",
    createdAt: "2026-10-18T14:00:00.000Z",
} as const

async function archiveMessageBy(employeeId: string, sentAt: string) {
    const committer = { name: "Omar Aboudou", email: "omar@example.com" }
    const director = { id: "director", title: "Director" }
    const thread = { id: "2026-10-18-budget", subject: "Budget" }
    await saveThread(projectRoot, {
        ...thread,
        createdAt: "2026-10-18T14:00:00.000Z",
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

describe("updateEmployeeId", () => {
    test("moves the employee to its new id", async () => {
        await updateEmployeeId(projectRoot, "omar", "omar-a")

        const renamed = await loadEmployee(projectRoot, "omar-a")
        expect(renamed).toMatchObject({ ...omar, id: "omar-a" })
        expect(await hasEmployee(projectRoot, "omar")).toBe(false)
    })

    test("records each former id, oldest first, with when it stopped", async () => {
        const before = Date.now()
        await updateEmployeeId(projectRoot, "omar", "omar-a")
        await updateEmployeeId(projectRoot, "omar-a", "omar-b")
        const after = Date.now()

        const renamed = await loadEmployee(projectRoot, "omar-b")
        const formerIds = renamed.formerIds ?? []
        const ids = formerIds.map(({ id }) => id)
        const untils = formerIds.map(({ until }) => Date.parse(until))
        expect(renamed.createdAt).toBe(omar.createdAt)
        expect(ids).toEqual(["omar", "omar-a"])
        expect(Math.min(...untils)).toBeGreaterThanOrEqual(before)
        expect(Math.max(...untils)).toBeLessThanOrEqual(after)
    })

    test("rewrites the positions it fills and its temporary assignments", async () => {
        const developer = { id: "dev", title: "Dev", description: "" }
        const tester = { id: "qa", title: "QA", description: "" }
        const omarWorker = { kind: "employee", employeeId: "omar" } as const
        await Promise.all([
            savePosition(projectRoot, {
                ...developer,
                defaultEmployeeId: "omar",
            }),
            savePosition(projectRoot, tester),
            savePositionState(projectRoot, "qa", {
                temporaryAssignment: omarWorker,
            }),
        ])

        const renaming = await updateEmployeeId(projectRoot, "omar", "omar-a")

        const [position, state] = await Promise.all([
            loadPosition(projectRoot, "dev"),
            loadPositionState(projectRoot, "qa"),
        ])
        const renamedWorker = {
            kind: "employee",
            employeeId: "omar-a",
        } as const
        expect(position.defaultEmployeeId).toBe("omar-a")
        expect(state.temporaryAssignment).toEqual(renamedWorker)
        expect(renaming.filledPositionIds).toEqual(["dev"])
        expect(renaming.temporarilyWorkedPositionIds).toEqual(["qa"])
    })

    test("refuses an id another employee has", async () => {
        const update = updateEmployeeId(projectRoot, "omar", "julie")

        await expect(update).rejects.toThrow(UserError)
        await expect(update).rejects.toThrow('"julie" already exists.')
        expect(await hasEmployee(projectRoot, "omar")).toBe(true)
    })

    test("refuses an id an earlier employee wrote under", async () => {
        await archiveMessageBy("claude", "2026-10-18T14:01:00.000Z")

        const update = updateEmployeeId(projectRoot, "omar", "claude")

        await expect(update).rejects.toThrow("add --reuse-id")
    })

    test("gives an employee back its own former id", async () => {
        await archiveMessageBy("omar", "2026-10-18T14:01:00.000Z")
        await updateEmployeeId(projectRoot, "omar", "omar-a")

        await updateEmployeeId(projectRoot, "omar-a", "omar")

        expect(await hasEmployee(projectRoot, "omar")).toBe(true)
    })

    test("refuses a new id that is not kebab-case", async () => {
        const update = updateEmployeeId(projectRoot, "omar", "Omar")

        await expect(update).rejects.toThrow('Invalid employee id "Omar"')
    })

    test("refuses an unknown employee", async () => {
        const update = updateEmployeeId(projectRoot, "bob", "robert")

        await expect(update).rejects.toThrow('No employee "bob".')
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const update = updateEmployeeId(elsewhere, "omar", "omar-a")

        await expect(update).rejects.toThrow("Run `llmco init` first.")
    })
})
