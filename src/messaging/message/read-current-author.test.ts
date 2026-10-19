import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createGitRepository } from "../../git/create-git-repository.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import { saveEmployee } from "../../organization/employee/storage.ts"
import { assignPosition } from "../../organization/position/assign-position.ts"
import { assignPositionTemporarily } from "../../organization/position/assign-position-temporarily.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import type { Archive } from "../thread/list-archives.ts"
import { readCurrentAuthor } from "./read-current-author.ts"

const variableName = "LLMCO_CURRENT_HUMAN_ID"
const shellValue = process.env[variableName]
const committer = { name: "Test User", email: "test@example.com" }
let projectRoot: string

beforeEach(async () => {
    delete process.env[variableName]
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, committer)
    await Promise.all([
        saveEmployee(projectRoot, {
            id: "julie",
            name: "Julie",
            kind: "human",
        }),
        saveEmployee(projectRoot, { id: "bob", name: "Bob", kind: "human" }),
        ...["graphics", "support"].map((id) =>
            savePosition(projectRoot, { id, title: id, description: "" }),
        ),
    ])
})

afterEach(async () => {
    if (shellValue === undefined) {
        delete process.env[variableName]
    } else {
        process.env[variableName] = shellValue
    }
    await rm(projectRoot, { recursive: true, force: true })
})

function createArchive(creatorPositionId: string, mentions: string[]): Archive {
    const createdAt = "2026-10-18T14:00:00.000Z"
    const position = { id: creatorPositionId, title: creatorPositionId }
    const thread = {
        id: "2026-10-18-logo",
        subject: "Logo",
        createdAt,
        createdBy: { position, committer },
    }
    const question = {
        threadId: thread.id,
        id: "20261018-140000-000-0000",
        position,
        committer,
        mentions,
        sentAt: createdAt,
        body: mentions.map((id) => `@${id}`).join(" "),
    }
    return { thread, messages: [question] }
}

async function readPositionId(
    options: Parameters<typeof readCurrentAuthor>[1] = {},
) {
    const author = await readCurrentAuthor(projectRoot, options)
    return author.position.id
}

describe("readCurrentAuthor", () => {
    test("is a director at the director's position, by default", async () => {
        const author = await readCurrentAuthor(projectRoot)

        expect(author).toEqual({
            position: { id: "director", title: "Director" },
            committer,
        })
    })

    test("is a human employee at their only position", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        process.env[variableName] = "julie"

        const author = await readCurrentAuthor(projectRoot)

        expect(author).toEqual({
            position: { id: "graphics", title: "graphics" },
            employee: { id: "julie", name: "Julie" },
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

    test("picks a human employee's only position in the thread", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        await assignPositionTemporarily(projectRoot, "support", {
            kind: "employee",
            rawEmployeeId: "julie",
        })
        process.env[variableName] = "julie"
        const archive = createArchive("director", ["support"])

        expect(await readPositionId({ archive })).toBe("support")
    })

    test("refuses to choose among several positions of a human employee", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        await assignPositionTemporarily(projectRoot, "support", {
            kind: "employee",
            rawEmployeeId: "julie",
        })
        process.env[variableName] = "julie"
        const refusalMessage =
            "Julie (julie) works several positions, graphics, support:"

        const reading = readCurrentAuthor(projectRoot, {
            archive: createArchive("director", []),
        })

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses a human employee working no position", async () => {
        process.env[variableName] = "julie"
        const assignmentCommand =
            "`llmco position assign-temporarily employee <position-id> julie`"

        const reading = readCurrentAuthor(projectRoot)

        await expect(reading).rejects.toThrow(assignmentCommand)
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

    test("lets a human employee working several positions choose one", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        await assignPositionTemporarily(projectRoot, "support", {
            kind: "employee",
            rawEmployeeId: "julie",
        })
        process.env[variableName] = "julie"

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
            "You don't work position \"support\": Claude Senior, an LLM employee, works it, and nobody writes on an LLM's behalf. Assign it to the directors temporarily first: `llmco position assign-temporarily directors support`."

        const reading = readPositionId({ asPositionId: "support" })

        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses a vacant position, giving the command to work it", async () => {
        process.env[variableName] = "julie"
        const refusalMessage =
            "it is vacant. A director can assign it to julie temporarily: `llmco position assign-temporarily employee support julie`."

        const reading = readPositionId({ asPositionId: "support" })

        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses an employee's position worked temporarily by another", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        await assignPositionTemporarily(projectRoot, "graphics", {
            kind: "employee",
            rawEmployeeId: "bob",
        })
        process.env[variableName] = "julie"
        const refusalMessage =
            "Bob, a human employee, works it. A director can give it back to julie: `llmco position unassign-temporarily graphics`."

        const reading = readPositionId({ asPositionId: "graphics" })

        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses the director's position to a human employee", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        process.env[variableName] = "julie"

        const reading = readPositionId({ asPositionId: "director" })

        await expect(reading).rejects.toThrow("Only directors write from")
    })

    test("refuses an unknown position", async () => {
        const reading = readPositionId({ asPositionId: "marketing" })

        await expect(reading).rejects.toThrow('No position "marketing".')
    })
})
