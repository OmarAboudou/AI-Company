import { sendMessage } from "../../messaging/message/send-message.ts"
import { createCompanyWorkedByDirectors } from "../create-company-worked-by-directors.testing.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
import { type OpenedTask, openNextTask } from "../task/open-next-task.ts"

export type CompanyWithTaskInProgress = {
    projectRoot: string
    threadId: string
    openedTask: OpenedTask
}

export async function createCompanyWithTaskInProgress(): Promise<CompanyWithTaskInProgress> {
    const { projectRoot, threadId } = await createCompanyWorkedByDirectors()
    await sendMessage(
        projectRoot,
        {},
        threadId,
        { body: "Can we ship on Friday?" },
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
    return { projectRoot, threadId, openedTask }
}
