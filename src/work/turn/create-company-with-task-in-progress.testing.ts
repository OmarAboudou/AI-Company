import { createCompanyWorkedByDirectors } from "../create-company-worked-by-directors.testing.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../send-example-message.testing.ts"
import { type OpenedTask, openNextTask } from "../task/open-next-task.ts"

export type CompanyWithTaskInProgress = {
    projectRoot: string
    ticketNumber: number
    openedTask: OpenedTask
}

export async function createCompanyWithTaskInProgress(): Promise<CompanyWithTaskInProgress> {
    const { projectRoot, ticketNumber } = await createCompanyWorkedByDirectors()
    await sendExampleMessage(
        projectRoot,
        ticketNumber,
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
    return { projectRoot, ticketNumber, openedTask }
}
