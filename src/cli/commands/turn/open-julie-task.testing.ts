import { sendMessage } from "../../../messaging/message/send-message.ts"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { julieEnvironment } from "../../../work/create-company-with-human-employee.testing.ts"
import { createExampleWorkCatalog } from "../../../work/create-example-work-catalog.testing.ts"
import { openNextTask } from "../../../work/task/open-next-task.ts"

export type JulieTask = { threadId: string; taskId: string }

export async function openJulieTask(projectRoot: string): Promise<JulieTask> {
    await createCompany(projectRoot, { name: "Acme", description: "" })
    await createEmployee(projectRoot, "julie", { name: "Julie", kind: "human" })
    await createPosition(projectRoot, "qa-tester", {
        title: "QA",
        description: "",
    })
    await assignPosition(projectRoot, "qa-tester", "julie")
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
        julieEnvironment,
        createExampleWorkCatalog(),
    )
    if (openedTask === undefined) {
        throw new Error("Julie has no task to open")
    }
    return { threadId: thread.id, taskId: openedTask.task.id }
}
