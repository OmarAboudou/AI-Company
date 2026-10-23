import { sendMessage } from "../../../messaging/message/send-message.ts"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { assignPositionTemporarily } from "../../../organization/position/assign-position-temporarily.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { createExampleWorkCatalog } from "../../../work/create-example-work-catalog.testing.ts"
import { openNextTask } from "../../../work/task/open-next-task.ts"

export type DirectorsTask = { threadId: string; taskId: string }

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
    const { thread } = await createThread(
        projectRoot,
        {},
        { subject: "Release" },
    )
    await sendMessage(
        projectRoot,
        {},
        thread.id,
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
    return { threadId: thread.id, taskId: openedTask.task.id }
}
