import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { loadExistingTicket } from "./load-existing-ticket.ts"
import { saveNewTicket } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("loadExistingTicket", () => {
    test("loads a ticket that exists", async () => {
        const ticket = {
            number: 1,
            title: "Choose the API framework",
            requester: { id: "founder", title: "Founder" },
            assignee: { id: "backend-developer", title: "Backend Developer" },
            committer: { name: "Omar Aboudou", email: "omar@example.com" },
            createdAt: "2026-10-23T14:03:22.123Z",
            request: "Hono or Express?",
        }
        await saveNewTicket(projectRoot, ticket)

        expect(await loadExistingTicket(projectRoot, 1)).toEqual(ticket)
    })

    test("refuses a number no ticket has, saying how to list them", async () => {
        const loading = loadExistingTicket(projectRoot, 4)

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow("No ticket #4.")
        await expect(loading).rejects.toThrow("aico ticket list")
    })
})
