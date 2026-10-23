import { createGitRepository } from "../git/create-git-repository.testing.ts"
import { createThread } from "../messaging/thread/create-thread.ts"
import { createTemporaryCompany } from "../organization/company/create-temporary-company.testing.ts"
import { assignPositionTemporarily } from "../organization/position/assign-position-temporarily.ts"
import { createPosition } from "../organization/position/create-position.ts"

export type CompanyWorkedByDirectors = { projectRoot: string; threadId: string }

export async function createCompanyWorkedByDirectors(): Promise<CompanyWorkedByDirectors> {
    const projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, {
        name: "Omar Aboudou",
        email: "omar@example.com",
    })
    for (const [id, title] of [
        ["qa-tester", "QA"],
        ["designer", "Designer"],
    ] as const) {
        await createPosition(projectRoot, id, { title, description: "" })
        await assignPositionTemporarily(projectRoot, id, { kind: "directors" })
    }
    const { thread } = await createThread(
        projectRoot,
        {},
        { subject: "Release" },
    )
    return { projectRoot, threadId: thread.id }
}
