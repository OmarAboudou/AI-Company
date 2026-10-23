import { describe, expect, test } from "bun:test"
import { recordEvent } from "../../../journal/record-event.ts"
import { loadJournal } from "../../../journal/storage.ts"
import { companyCreatedEventType } from "../../../organization/company/schema.ts"
import {
    getTaskSummaries,
    useListeningCompany,
} from "./use-listening-company.testing.ts"

const { getProjectRoot, dispatch, endSessionOf } = useListeningCompany()

async function recordCompanyCreation() {
    await recordEvent(
        await loadJournal(getProjectRoot()),
        companyCreatedEventType,
        { depth: 0 },
    )
}

describe("whatNowListeners", () => {
    test("give the founder What now? once the company is created", async () => {
        await recordCompanyCreation()

        const { createdTasks } = await dispatch()

        expect(getTaskSummaries(createdTasks)).toEqual(["what-now @founder"])
    })

    test("give the founder What now? again once its session ends", async () => {
        await recordCompanyCreation()
        await dispatch()

        const { createdTasks } = await endSessionOf("founder")

        expect(getTaskSummaries(createdTasks)).toEqual(["what-now @founder"])
    })

    test("never give the founder a second What now? while one is pending", async () => {
        await recordCompanyCreation()
        await recordCompanyCreation()

        const { createdTasks } = await dispatch()

        expect(getTaskSummaries(createdTasks)).toEqual(["what-now @founder"])
    })
})
