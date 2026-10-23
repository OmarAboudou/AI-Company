import { readGitCommitter } from "../../git/read-git-committer.ts"
import { loadJournal } from "../../journal/storage.ts"
import { createTicket, type TicketToCreate } from "./create-ticket.ts"
import type { Ticket } from "./schema.ts"

export async function createExampleTicket(
    projectRoot: string,
    ticketToCreate: Partial<TicketToCreate> = {},
): Promise<Ticket> {
    const author = {
        position: { id: "director", title: "Director" },
        committer: readGitCommitter(projectRoot),
    }
    return createTicket(
        await loadJournal(projectRoot),
        author,
        {
            title: "Choose the API framework",
            request: "Hono or Express?",
            rawAssigneePositionId: "director",
            ...ticketToCreate,
        },
        { depth: 0 },
    )
}
