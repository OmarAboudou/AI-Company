import { describe, expect, test } from "bun:test"
import { loadJournal } from "../../../journal/storage.ts"
import { pauseCompany } from "../../pause/pause-company.ts"
import {
    founder,
    getTaskSummaries,
    useListeningCompany,
} from "./use-listening-company.testing.ts"

const { getProjectRoot, failTaskOf, relaunch, act, createDeveloperTicket } =
    useListeningCompany()

describe("relaunchListener", () => {
    test("give the position with the hand its task again at the relaunch", async () => {
        await createDeveloperTicket()
        await failTaskOf("developer")

        const { createdTasks } = await relaunch()

        expect(getTaskSummaries(createdTasks)).toEqual(["resume @developer"])
    })

    test("give no task at the relaunch on a ticket closed during the pause", async () => {
        await createDeveloperTicket()
        await failTaskOf("developer")
        await act("cancel", founder)

        const { createdTasks } = await relaunch()

        expect(createdTasks).toEqual([])
    })

    test("give no task at a relaunch that follows no failure", async () => {
        await createDeveloperTicket()
        await pauseCompany(await loadJournal(getProjectRoot()))

        const { createdTasks } = await relaunch()

        expect(createdTasks).toEqual([])
    })
})
