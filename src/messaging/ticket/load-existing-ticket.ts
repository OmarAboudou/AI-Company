import { UserError } from "../../user-error.ts"
import type { Ticket } from "./schema.ts"
import { hasTicket, loadTicket } from "./storage.ts"

export async function loadExistingTicket(
    projectRoot: string,
    number: number,
): Promise<Ticket> {
    if (!(await hasTicket(projectRoot, number))) {
        throw new UserError(`No ticket #${number}. Run \`aico ticket list\`.`)
    }
    return loadTicket(projectRoot, number)
}
