import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createTicketNumber } from "./create-ticket-number.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function createTicketFolders(numbers: number[]): Promise<void> {
    for (const number of numbers) {
        const folderPath = join(projectRoot, ".aico", "tickets", String(number))
        await mkdir(folderPath, { recursive: true })
    }
}

describe("createTicketNumber", () => {
    test("numbers the first ticket 1", async () => {
        expect(await createTicketNumber(projectRoot)).toBe(1)
    })

    test("numbers a ticket after the highest", async () => {
        await createTicketFolders([1, 2])

        expect(await createTicketNumber(projectRoot)).toBe(3)
    })

    test("never gives a number again, even one missing from the sequence", async () => {
        await createTicketFolders([1, 3])

        expect(await createTicketNumber(projectRoot)).toBe(4)
    })
})
