import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType } from "../../journal/schema.ts"

export const PositionSnapshotSchema = z
    .strictObject({
        id: IdSchema,
        title: z.string().trim().min(1),
    })
    .meta({
        description:
            "A position as it was when this was written: its id and title. Never rewritten afterwards, even if the position is renamed or deleted.",
    })

export const EmployeeSnapshotSchema = z
    .strictObject({
        id: IdSchema,
        name: z.string().trim().min(1),
    })
    .meta({
        description:
            "An employee as it was when this was written: its id and name. Never rewritten afterwards.",
    })

export const CommitterSchema = z
    .strictObject({
        name: z.string().trim().min(1),
        email: z.string().trim().min(1),
    })
    .meta({
        description:
            "The person at the keyboard according to git config user.name and user.email, as in a commit.",
    })

export const TicketNumberSchema = z.int().min(1).meta({
    description:
        "Number of the ticket, i.e. the name of its folder in .aico/tickets: tickets are numbered in sequence, from 1.",
})

export const TicketConfigSchema = z
    .strictObject({
        title: z.string().trim().min(1).meta({
            description:
                "What the ticket asks for, in a few words, e.g. Choose the API framework.",
        }),
        requester: PositionSnapshotSchema.meta({
            description: "The position that asks: the ticket's requester.",
        }),
        assignee: PositionSnapshotSchema.meta({
            description:
                "The position asked when the ticket was created: its first assignee.",
        }),
        employee: EmployeeSnapshotSchema.optional().meta({
            description:
                "The employee who created the ticket, working the requester's position. Absent when a person created it, whom the committer names.",
        }),
        committer: CommitterSchema,
        createdAt: z.iso.datetime().meta({
            description: "When the ticket was created, in UTC.",
        }),
    })
    .meta({
        title: "AICo ticket",
        description:
            "A ticket, a request from one position to another, in .aico/tickets/<ticket-number>/ticket.json. Its request lives next to it, in request.md. Never modified once written.",
    })

export type TicketConfig = z.infer<typeof TicketConfigSchema>

export type Ticket = TicketConfig & {
    number: number
    request: string
}

export const ticketCreatedEventType = defineEventType({
    type: "ticket-created",
    description:
        "A position asked another for work: the ticket was created, and its assignee has the hand.",
    fields: {
        ticketNumber: TicketNumberSchema,
        requesterPositionId: IdSchema.meta({
            description:
                "Id of the position that asks, as its ticket.json records it.",
        }),
        assigneePositionId: IdSchema.meta({
            description:
                "Id of the position asked, as its ticket.json records it.",
        }),
        runId: IdSchema.optional().meta({
            description:
                "Id of the run in which the ticket was created, i.e. the name of its transcript in .aico/.state/runs. Absent when it was created outside a run.",
        }),
    },
})
