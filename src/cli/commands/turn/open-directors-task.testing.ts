import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { assignPositionTemporarily } from "../../../organization/position/assign-position-temporarily.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { openNextTask } from "../../../work/task/open-next-task.ts"

export type DirectorsTask = { ticketNumber: number; taskId: string }

// The directors open the task that AICo's own listeners give: the
// command line, which knows only AICo's task types, can then end it. The
// QA position is selected, the director's What now? coming first.
export async function openDirectorsTask(
    projectRoot: string,
): Promise<DirectorsTask> {
    await createCompany(projectRoot, { name: "Acme" })
    await createPosition(projectRoot, "qa-tester", {
        title: "QA",
        description: "",
    })
    await assignPositionTemporarily(projectRoot, "qa-tester", {
        kind: "directors",
    })
    const ticket = await createExampleTicket(projectRoot, {
        title: "Release",
        request: "Can we ship on Friday?",
        rawAssigneePositionId: "qa-tester",
    })
    const { openedTask } = await openNextTask(projectRoot, {
        AICO_CURRENT_POSITION_ID: "qa-tester",
    })
    if (openedTask === undefined) {
        throw new Error("The directors have no task to open")
    }
    return { ticketNumber: ticket.number, taskId: openedTask.task.id }
}
