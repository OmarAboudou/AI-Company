import { loadJournal } from "../../journal/storage.ts"
import { formatTicketNumbers } from "../../messaging/ticket/format-ticket-numbers.ts"
import { UserError } from "../../user-error.ts"
import { loadPendingPositionIdsByTicket } from "../../work/task/load-pending-position-ids-by-ticket.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadCompany } from "../company/storage.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { Position } from "./schema.ts"
import { deletePositionFolder } from "./storage.ts"

export type DeletePositionResult = {
    position: Position
    pendingTicketNumbers: number[]
}

export async function deletePosition(
    projectRoot: string,
    rawId: string,
    { shouldForce = false }: { shouldForce?: boolean } = {},
): Promise<DeletePositionResult> {
    await requireCompany(projectRoot)
    const [position, company, journal] = await Promise.all([
        loadExistingPosition(projectRoot, rawId),
        loadCompany(projectRoot),
        loadJournal(projectRoot),
    ])
    const pendingPositionIdsByTicket =
        await loadPendingPositionIdsByTicket(journal)
    if (company.directorPositionId === position.id) {
        throw new UserError(
            `Position "${position.id}" is the director's position: it can't be deleted.`,
        )
    }
    const pendingTicketNumbers = [...pendingPositionIdsByTicket]
        .filter(([, positionIds]) => positionIds.includes(position.id))
        .map(([ticketNumber]) => ticketNumber)
    if (pendingTicketNumbers.length > 0 && !shouldForce) {
        throw new UserError(
            `Position "${position.id}" has tasks pending on these tickets: ${formatTicketNumbers(pendingTicketNumbers)}. Add --force to delete it anyway; its tasks will wait for a position that no longer exists.`,
        )
    }
    await deletePositionFolder(projectRoot, position.id)
    return { position, pendingTicketNumbers }
}
