import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { UserError } from "../../user-error.ts"
import { pauseCompany } from "./pause-company.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("pauseCompany", () => {
    test("records the pause in the journal", async () => {
        await pauseCompany(await loadJournal(projectRoot))

        const events = await listEvents(projectRoot)
        expect(events).toMatchObject([{ type: "company-paused", depth: 0 }])
    })

    test("refuses to pause a paused company", async () => {
        await pauseCompany(await loadJournal(projectRoot))

        const pausing = pauseCompany(await loadJournal(projectRoot))

        await expect(pausing).rejects.toThrow(UserError)
        await expect(pausing).rejects.toThrow(
            "The company is already paused. Run `aico company relaunch` to relaunch it.",
        )
    })
})
