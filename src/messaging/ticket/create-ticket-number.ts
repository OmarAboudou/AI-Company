import { listTicketNumbers } from "./storage.ts"

export async function createTicketNumber(projectRoot: string): Promise<number> {
    const ticketNumbers = await listTicketNumbers(projectRoot)
    return (ticketNumbers.at(-1) ?? 0) + 1
}
