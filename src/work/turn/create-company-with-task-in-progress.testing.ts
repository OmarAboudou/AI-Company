import { sendMessage } from "../../messaging/message/send-message.ts"
import {
    createCompanyWithHumanEmployee,
    julieEnvironment,
} from "../create-company-with-human-employee.testing.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
import { type OpenedTask, openNextTask } from "../task/open-next-task.ts"

export type CompanyWithTaskInProgress = {
    projectRoot: string
    threadId: string
    openedTask: OpenedTask
}

export async function createCompanyWithTaskInProgress(): Promise<CompanyWithTaskInProgress> {
    const { projectRoot, threadId } = await createCompanyWithHumanEmployee()
    await sendMessage(
        projectRoot,
        {},
        threadId,
        { body: "Can we ship on Friday?" },
        createExampleWorkCatalog(["qa-tester"]),
    )
    const { openedTask } = await openNextTask(
        projectRoot,
        julieEnvironment,
        createExampleWorkCatalog(),
    )
    if (openedTask === undefined) {
        throw new Error("Julie has no task to open")
    }
    return { projectRoot, threadId, openedTask }
}
