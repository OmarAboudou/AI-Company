import { createGitRepository } from "../git/create-git-repository.testing.ts"
import { createThread } from "../messaging/thread/create-thread.ts"
import { createTemporaryCompany } from "../organization/company/create-temporary-company.testing.ts"
import { createEmployee } from "../organization/employee/create-employee.ts"
import { assignPosition } from "../organization/position/assign-position.ts"
import { createPosition } from "../organization/position/create-position.ts"

export type CompanyWithHumanEmployee = { projectRoot: string; threadId: string }

export const julieEnvironment = { LLMCO_CURRENT_HUMAN_ID: "julie" }

export async function createCompanyWithHumanEmployee(): Promise<CompanyWithHumanEmployee> {
    const projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, {
        name: "Omar Aboudou",
        email: "omar@example.com",
    })
    await createEmployee(projectRoot, "julie", { name: "Julie", kind: "human" })
    await createPosition(projectRoot, "qa-tester", {
        title: "QA",
        description: "",
    })
    await createPosition(projectRoot, "designer", {
        title: "Designer",
        description: "",
    })
    await assignPosition(projectRoot, "qa-tester", "julie")
    await assignPosition(projectRoot, "designer", "julie")
    const { thread } = await createThread(
        projectRoot,
        {},
        { subject: "Release" },
    )
    return { projectRoot, threadId: thread.id }
}
