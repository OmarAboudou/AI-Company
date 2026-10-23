import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createGitRepository } from "../../git/create-git-repository.testing.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { saveEmployee } from "../../organization/employee/storage.ts"
import { assignPosition } from "../../organization/position/assign-position.ts"
import { assignPositionTemporarily } from "../../organization/position/assign-position-temporarily.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import type { Archive } from "../thread/list-archives.ts"
import { readCurrentAuthor } from "./read-current-author.ts"

const committer = { name: "Test User", email: "test@example.com" }
let environment: NodeJS.ProcessEnv
let projectRoot: string

beforeEach(async () => {
    environment = {}
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, committer)
    await Promise.all([
        saveEmployee(projectRoot, { id: "bob", name: "Bob", kind: "human" }),
        ...["graphics", "support"].map((id) =>
            savePosition(projectRoot, { id, title: id, description: "" }),
        ),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function createArchive(
    creatorPositionId: string,
    writerPositionIds: string[],
): Archive {
    const createdAt = "2026-10-18T14:00:00.000Z"
    const thread = {
        id: "2026-10-18-logo",
        subject: "Logo",
        createdAt,
        createdBy: {
            position: { id: creatorPositionId, title: creatorPositionId },
            committer,
        },
    }
    const messages = writerPositionIds.map((id, index) => ({
        threadId: thread.id,
        id: `20261018-14000${index}-000-0000`,
        position: { id, title: id },
        committer,
        sentAt: createdAt,
        body: "Hello.",
    }))
    return { thread, messages }
}

async function readPositionId(
    options: Parameters<typeof readCurrentAuthor>[2] = {},
) {
    const author = await readCurrentAuthor(projectRoot, environment, options)
    return author.position.id
}

describe("readCurrentAuthor", () => {
    test("is a director at the director's position, by default", async () => {
        const author = await readCurrentAuthor(projectRoot, environment)

        expect(author).toEqual({
            position: { id: "director", title: "Director" },
            committer,
        })
    })

    test("picks a director's only position in the thread", async () => {
        await assignPositionTemporarily(projectRoot, "support", {
            kind: "directors",
        })
        const archive = createArchive("graphics", ["support"])

        expect(await readPositionId({ archive })).toBe("support")
    })

    test("picks the director's position when several of theirs are in the thread", async () => {
        await assignPositionTemporarily(projectRoot, "support", {
            kind: "directors",
        })
        const archive = createArchive("director", ["support"])

        expect(await readPositionId({ archive })).toBe("director")
    })
})

describe("readCurrentAuthor with a position chosen", () => {
    test("writes from one of the positions the person works", async () => {
        await assignPositionTemporarily(projectRoot, "support", {
            kind: "directors",
        })

        const positionId = await readPositionId({ asPositionId: "support" })

        expect(positionId).toBe("support")
    })

    test("refuses a position worked by an LLM employee", async () => {
        await saveEmployee(projectRoot, {
            id: "claude",
            name: "Claude Senior",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
        await assignPosition(projectRoot, "support", "claude")
        const refusalMessage =
            "You don't work position \"support\": Claude Senior, an LLM employee, works it, and nobody writes on an LLM's behalf. Assign it to the directors temporarily first: `aico position assign-temporarily directors support`."

        const reading = readPositionId({ asPositionId: "support" })

        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses a vacant position, giving the command to work it", async () => {
        const refusalMessage =
            "it is vacant. Assign it to the directors temporarily first: `aico position assign-temporarily directors support`."

        const reading = readPositionId({ asPositionId: "support" })

        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses a position a human employee works", async () => {
        await assignPosition(projectRoot, "graphics", "bob")
        const refusalMessage =
            "Bob, a human employee, works it. Assign it to the directors temporarily first: `aico position assign-temporarily directors graphics`."

        const reading = readPositionId({ asPositionId: "graphics" })

        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses an unknown position", async () => {
        const reading = readPositionId({ asPositionId: "marketing" })

        await expect(reading).rejects.toThrow('No position "marketing".')
    })
})

describe("readCurrentAuthor with a position selected in the shell", () => {
    beforeEach(async () => {
        for (const positionId of ["graphics", "support"]) {
            await assignPositionTemporarily(projectRoot, positionId, {
                kind: "directors",
            })
        }
    })

    test("writes from the selected position", async () => {
        environment.AICO_CURRENT_POSITION_ID = "support"

        const positionId = await readPositionId()

        expect(positionId).toBe("support")
    })

    test("lets --as-position choose another one for a message", async () => {
        environment.AICO_CURRENT_POSITION_ID = "support"

        const positionId = await readPositionId({ asPositionId: "graphics" })

        expect(positionId).toBe("graphics")
    })

    test("refuses a selected position the person doesn't work now", async () => {
        await savePosition(projectRoot, {
            id: "sales",
            title: "Sales",
            description: "",
        })
        environment.AICO_CURRENT_POSITION_ID = "sales"

        const reading = readPositionId()

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow("isn't one you work now")
    })
})
