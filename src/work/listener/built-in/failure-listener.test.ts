import { describe, expect, test } from "bun:test"
import {
    getTaskSummaries,
    useListeningCompany,
} from "./use-listening-company.testing.ts"

const { findTaskOf, failTaskOf, createDeveloperTicket } = useListeningCompany()

describe("failureListener", () => {
    test("give the founder Analyse the failure once a task failed", async () => {
        await createDeveloperTicket()
        const failedTask = await findTaskOf("developer", "queued")

        const { createdTasks } = await failTaskOf("developer")

        expect(getTaskSummaries(createdTasks)).toEqual([
            "analyse-failure @founder",
        ])
        expect(createdTasks[0]?.params).toEqual({ taskId: failedTask?.id })
    })
})
