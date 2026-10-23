export function formatTicketNumbers(ticketNumbers: number[]): string {
    return ticketNumbers.map((ticketNumber) => `#${ticketNumber}`).join(", ")
}
