import { z } from "zod"
import { getTicketStates } from "../../../messaging/ticket/get-ticket-states.ts"
import { TicketNumberSchema } from "../../../messaging/ticket/schema.ts"
import { loadTicket } from "../../../messaging/ticket/storage.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import type { BuiltInToolName } from "../../tool/built-in/built-in.ts"
import { type BoundToolInputs, defineTaskType } from "../define-task-type.ts"
import { buildTicketMessage } from "./build-ticket-message.ts"
import {
    loadTicketSituation,
    type TicketSituation,
} from "./load-ticket-situation.ts"

type TicketToolName = Extract<
    BuiltInToolName,
    | "ticket_answer"
    | "ticket_ask"
    | "ticket_cancel"
    | "ticket_deliver"
    | "ticket_refuse"
    | "ticket_validate"
>

export type TicketTaskTypeDefinition = {
    type: string
    toolNames: TicketToolName[]
    buildIntroduction(situation: TicketSituation): string
    instructions: string
}

export function defineTicketTaskType({
    type,
    toolNames,
    buildIntroduction,
    instructions,
}: TicketTaskTypeDefinition) {
    return defineTaskType({
        type,
        paramsSchema: z.strictObject({ ticketNumber: TicketNumberSchema }),
        resultSchema: z.strictObject({}),
        async createSession({ ticketNumber }, ctx) {
            const situation = await loadTicketSituation(ctx, ticketNumber)
            const boundToolInputs: BoundToolInputs = {
                ticket_show: { ticketNumber },
            }
            for (const toolName of toolNames) {
                boundToolInputs[toolName] = { ticketNumber }
            }
            return {
                userMessage: buildTicketMessage(situation, {
                    introduction: buildIntroduction(situation),
                    instructions,
                }),
                toolNames: [...toolNames, "ticket_show"],
                boundToolInputs,
                result: {},
            }
        },
        async getCancellationReason(
            { ticketNumber },
            { projectRoot, journal },
        ) {
            const [ticket, positions] = await Promise.all([
                loadTicket(projectRoot, ticketNumber),
                listPositions(projectRoot),
            ])
            const state = getTicketStates(
                [ticket],
                journal.events,
                positions,
            ).get(ticketNumber)
            return state?.status === "closed"
                ? `Ticket #${ticketNumber} was closed, ${state.outcome}.`
                : undefined
        },
    })
}
