import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { createDraft } from "./create-draft.ts"
import type { Author } from "./schema.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await savePosition(projectRoot, {
        id: "qa-tester",
        title: "QA Tester",
        description: "",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const director: Author = {
    position: { id: "director", title: "Director" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
}

describe("createDraft", () => {
    test("keeps the author and the body, with the positions it mentions", async () => {
        const body = "@qa-tester, a test plan?"

        const draft = await createDraft(projectRoot, director, body)

        expect(draft).toEqual({
            ...director,
            body,
            mentions: ["qa-tester"],
            unknownMentionIds: [],
        })
    })

    test("sets apart the mentions that name no position", async () => {
        const body = "@qa-testers, a test plan?"

        const draft = await createDraft(projectRoot, director, body)

        expect(draft.mentions).toEqual([])
        expect(draft.unknownMentionIds).toEqual(["qa-testers"])
    })

    test("doesn't count a mention of the author's own position", async () => {
        const body = "Note to @director: done."

        const draft = await createDraft(projectRoot, director, body)

        expect(draft.mentions).toEqual([])
        expect(draft.unknownMentionIds).toEqual([])
    })

    test("refuses a mention of a specific employee, for now", async () => {
        const body = "@qa-tester:claude-senior, a review?"
        const refusalMessage =
            "Mentioning a specific employee (@qa-tester:claude-senior)"

        const drafting = createDraft(projectRoot, director, body)

        await expect(drafting).rejects.toThrow(UserError)
        await expect(drafting).rejects.toThrow(refusalMessage)
    })

    test("refuses an empty body", async () => {
        const drafting = createDraft(projectRoot, director, "  \n")

        await expect(drafting).rejects.toThrow("The message's body is empty.")
    })
})
