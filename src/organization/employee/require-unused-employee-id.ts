import { isAuthorOf } from "../../ids/is-author-of.ts"
import { listMessages } from "../../messaging/message/storage.ts"
import type { Ticket } from "../../messaging/ticket/schema.ts"
import { listTickets } from "../../messaging/ticket/storage.ts"
import { UserError } from "../../user-error.ts"
import type { Employee } from "./schema.ts"
import { listEmployees } from "./storage.ts"

type Authorship = { employee?: { id: string }; sentAt: string }

async function listTicketAuthorships(
    projectRoot: string,
    ticket: Ticket,
): Promise<Authorship[]> {
    const ticketAuthorship = {
        employee: ticket.employee,
        sentAt: ticket.createdAt,
    }
    const messages = await listMessages(projectRoot, ticket.number)
    return [ticketAuthorship, ...messages]
}

async function listEarlierUses(
    projectRoot: string,
    id: string,
    renamedEmployee: Employee | undefined,
): Promise<string[]> {
    const [employees, tickets] = await Promise.all([
        listEmployees(projectRoot),
        listTickets(projectRoot),
    ])
    const formerIdUses = employees
        .filter(
            (employee) =>
                employee.id !== renamedEmployee?.id &&
                employee.formerIds?.some(({ id: formerId }) => formerId === id),
        )
        .map((employee) => `as a former id of employee "${employee.id}"`)
    const ticketUses = await Promise.all(
        tickets.map(async (ticket) => {
            const authorships = await listTicketAuthorships(projectRoot, ticket)
            const isUsed = authorships.some(
                (authorship) =>
                    authorship.employee?.id === id &&
                    !(
                        renamedEmployee !== undefined &&
                        isAuthorOf(renamedEmployee, authorship)
                    ),
            )
            return isUsed ? [`in ticket #${ticket.number}`] : []
        }),
    )
    return [...formerIdUses, ...ticketUses.flat()]
}

export async function requireUnusedEmployeeId(
    projectRoot: string,
    id: string,
    {
        shouldReuseId = false,
        renamedEmployee,
    }: { shouldReuseId?: boolean; renamedEmployee?: Employee } = {},
): Promise<void> {
    if (shouldReuseId) {
        return
    }
    const earlierUses = await listEarlierUses(projectRoot, id, renamedEmployee)
    if (earlierUses.length > 0) {
        throw new UserError(
            `Employee id "${id}" was used before: ${earlierUses.join(", ")}. An employee is a person, and the archives would name two people the same way: add --reuse-id to reuse it anyway.`,
        )
    }
}
