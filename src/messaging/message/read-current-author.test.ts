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

    test("is a human employee at their only position", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        environment.AICO_CURRENT_HUMAN_ID = "julie"

        const author = await readCurrentAuthor(projectRoot, environment)

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
        environment.AICO_CURRENT_HUMAN_ID = "julie"
        const archive = createArchive("director", ["support"])

        expect(await readPositionId({ archive })).toBe("support")
    })

    test("refuses to choose among several positions of a human employee", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        await assignPositionTemporarily(projectRoot, "support", {
            kind: "employee",
            rawEmployeeId: "julie",
        })
        environment.AICO_CURRENT_HUMAN_ID = "julie"
        const refusalMessage =
            "Julie (julie) works several positions, graphics, support:"

        const reading = readCurrentAuthor(projectRoot, environment, {
            archive: createArchive("director", []),
        })

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses a human employee working no position", async () => {
        environment.AICO_CURRENT_HUMAN_ID = "julie"
        const assignmentCommand =
            "`aico position assign-temporarily employee <position-id> julie`"

        const reading = readCurrentAuthor(projectRoot, environment)

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
        environment.AICO_CURRENT_HUMAN_ID = "julie"

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
        environment.AICO_CURRENT_HUMAN_ID = "julie"
        const refusalMessage =
            "it is vacant. A director can assign it to julie temporarily: `aico position assign-temporarily employee support julie`."

        const reading = readPositionId({ asPositionId: "support" })

        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses an employee's position worked temporarily by another", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        await assignPositionTemporarily(projectRoot, "graphics", {
            kind: "employee",
            rawEmployeeId: "bob",
        })
        environment.AICO_CURRENT_HUMAN_ID = "julie"
        const refusalMessage =
            "Bob, a human employee, works it. A director can give it back to julie: `aico position unassign-temporarily graphics`."

        const reading = readPositionId({ asPositionId: "graphics" })

        await expect(reading).rejects.toThrow(refusalMessage)
    })

    test("refuses the director's position to a human employee", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        environment.AICO_CURRENT_HUMAN_ID = "julie"

        const reading = readPositionId({ asPositionId: "director" })

        await expect(reading).rejects.toThrow("Only directors write from")
    })

    test("refuses an unknown position", async () => {
        const reading = readPositionId({ asPositionId: "marketing" })

        await expect(reading).rejects.toThrow('No position "marketing".')
    })
})

describe("readCurrentAuthor with a position selected in the shell", () => {
    beforeEach(async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        await assignPositionTemporarily(projectRoot, "support", {
            kind: "employee",
            rawEmployeeId: "julie",
        })
        environment.AICO_CURRENT_HUMAN_ID = "julie"
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
        environment.AICO_CURRENT_POSITION_ID = "director"

        const reading = readPositionId()

        await expect(reading).rejects.toThrow(UserError)
        await expect(reading).rejects.toThrow("isn't one you work now")
    })
})
