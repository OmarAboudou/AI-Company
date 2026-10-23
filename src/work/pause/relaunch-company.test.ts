import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { pauseCompany } from "./pause-company.ts"
import { relaunchCompany } from "./relaunch-company.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("relaunchCompany", () => {
    test("records the relaunch of the paused company", async () => {
        await pauseCompany(await loadJournal(projectRoot))

        await relaunchCompany(await loadJournal(projectRoot))

        const events = await listEvents(projectRoot)
        expect(events.map(({ type }) => type)).toEqual([
            "company-paused",
            "company-relaunched",
        ])
    })

    test("refuses to relaunch a company that isn't paused", async () => {
        const relaunching = relaunchCompany(await loadJournal(projectRoot))

        await expect(relaunching).rejects.toThrow(
            "The company isn't paused: nothing to relaunch.",
        )
        expect(await listEvents(projectRoot)).toEqual([])
    })
})
