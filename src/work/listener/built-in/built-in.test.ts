import { describe, expect, test } from "bun:test"
import { loadJournal } from "../../../journal/storage.ts"
import { handOverTicket } from "../../../messaging/ticket/act/hand-over-ticket.ts"
import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import {
    developer,
    founder,
    getTaskSummaries,
    useListeningCompany,
} from "./use-listening-company.testing.ts"

const { getProjectRoot, dispatch, endSessionOf, act, createDeveloperTicket } =
    useListeningCompany()

describe("AICo's listeners", () => {
    test("give a ticket's assignee Handle once it is created", async () => {
        const { createdTasks } = await createDeveloperTicket()

        expect(getTaskSummaries(createdTasks)).toEqual(["handle @developer"])
        expect(createdTasks[0]?.params).toEqual({ ticketNumber: 1 })
    })

    test("give the task each act calls for to the position that has the hand", async () => {
        await createDeveloperTicket()

        const asking = await act("ask", developer)
        const answering = await act("answer", founder)
        const delivering = await act("deliver", developer)
        const refusing = await act("refuse", founder)

        expect(getTaskSummaries(asking.createdTasks)).toEqual([
            "answer @founder",
        ])
        expect(getTaskSummaries(answering.createdTasks)).toEqual([
            "resume @developer",
        ])
        expect(getTaskSummaries(delivering.createdTasks)).toEqual([
            "validate @founder",
        ])
        expect(getTaskSummaries(refusing.createdTasks)).toEqual([
            "resume @developer",
        ])
    })

    test("give the assignee Resume once its session ends without passing the hand", async () => {
        await createDeveloperTicket()

        const { createdTasks } = await endSessionOf("developer")

        expect(getTaskSummaries(createdTasks)).toEqual(["resume @developer"])
    })

    test("give the requester its task again once its session ends without acting", async () => {
        await createDeveloperTicket()
        await act("ask", developer)

        const { createdTasks } = await endSessionOf("founder")

        expect(getTaskSummaries(createdTasks)).toEqual(["answer @founder"])
    })

    test("give nothing more once a session ended passing the hand", async () => {
        await createDeveloperTicket()
        await act("ask", developer)

        const { createdTasks } = await endSessionOf("developer", true)

        expect(createdTasks).toEqual([])
    })

    test.each(["cancel", "close"] as const)(
        "cancel a closed ticket's queued tasks, at %p",
        async (actName) => {
            await createDeveloperTicket()

            const { cancelledTasks } = await act(actName, founder)

            expect(getTaskSummaries(cancelledTasks)).toEqual([
                "handle @developer",
            ])
        },
    )

    test("give no task on a ticket already closed", async () => {
        await createExampleTicket(getProjectRoot(), {
            rawAssigneePositionId: "developer",
        })

        const { createdTasks } = await act("cancel", founder)

        expect(createdTasks).toEqual([])
    })

    test("give the new assignee Handle once the ticket is handed over", async () => {
        await createDeveloperTicket()
        await createPosition(getProjectRoot(), "designer", {
            title: "Designer",
            description: "",
        })

        await handOverTicket(
            await loadJournal(getProjectRoot()),
            founder,
            {
                ticketNumber: 1,
                body: "The designer knows.",
                rawAssigneePositionId: "designer",
            },
            { depth: 0 },
        )
        const { createdTasks } = await dispatch()

        expect(getTaskSummaries(createdTasks)).toEqual(["handle @designer"])
    })

    test("give the founder Analyse the renouncement once the assignee renounced", async () => {
        await createDeveloperTicket()

        const { createdTasks } = await act("renounce", developer)

        expect(getTaskSummaries(createdTasks)).toEqual([
            "analyse-renouncement @founder",
        ])
    })

    test("give the founder Analyse the renouncement again once it ended without arbitrating", async () => {
        await createDeveloperTicket()
        await act("renounce", developer)

        const { createdTasks } = await endSessionOf("founder")

        expect(getTaskSummaries(createdTasks)).toEqual([
            "analyse-renouncement @founder",
        ])
    })

    test("give the assignee Resume once the founder gives the ticket back", async () => {
        await createDeveloperTicket()
        await act("renounce", developer)

        const { createdTasks } = await act("give-back", founder)

        expect(getTaskSummaries(createdTasks)).toEqual(["resume @developer"])
    })
})
