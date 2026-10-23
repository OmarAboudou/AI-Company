import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { assignPositionTemporarily } from "../../../organization/position/assign-position-temporarily.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { createExampleWorkCatalog } from "../../../work/create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../../../work/send-example-message.testing.ts"
import { openNextTask } from "../../../work/task/open-next-task.ts"

export type DirectorsTask = { ticketNumber: number; taskId: string }

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
        rawAssigneePositionId: "qa-tester",
    })
    await sendExampleMessage(
        projectRoot,
        ticket.number,
        "Can we ship on Friday?",
        createExampleWorkCatalog(["qa-tester"]),
    )
    const { openedTask } = await openNextTask(
        projectRoot,
        {},
        createExampleWorkCatalog(),
    )
    if (openedTask === undefined) {
        throw new Error("The directors have no task to open")
    }
    return { ticketNumber: ticket.number, taskId: openedTask.task.id }
}
