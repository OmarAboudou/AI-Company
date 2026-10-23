import { createGitRepository } from "../git/create-git-repository.testing.ts"
import { createExampleTicket } from "../messaging/ticket/create-example-ticket.testing.ts"
import { createTemporaryCompany } from "../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../organization/position/create-position.ts"

export type CompanyWorkedByDirectors = {
    projectRoot: string
    ticketNumber: number
}

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
    }
    const ticket = await createExampleTicket(projectRoot, {
        title: "Release",
        rawAssigneePositionId: "qa-tester",
    })
    return { projectRoot, ticketNumber: ticket.number }
}
