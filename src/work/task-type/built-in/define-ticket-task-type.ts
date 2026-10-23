import { z } from "zod"
import { getHandPositionId } from "../../../messaging/ticket/get-hand-position-id.ts"
import { getTicketStates } from "../../../messaging/ticket/get-ticket-states.ts"
import {
    TicketNumberSchema,
    type TicketStatus,
} from "../../../messaging/ticket/schema.ts"
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
    status: Exclude<TicketStatus, "closed">
    toolNames: TicketToolName[]
    buildIntroduction(situation: TicketSituation): string
    instructions: string
}

export function defineTicketTaskType({
    type,
    status,
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
            { projectRoot, journal, position },
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
            if (state?.status === "closed") {
                return `Ticket #${ticketNumber} was closed, ${state.outcome}.`
            }
            const handPositionId = state && getHandPositionId(state)
            return state?.status === status && handPositionId === position.id
                ? undefined
                : `Ticket #${ticketNumber} changed since: @${handPositionId} has the hand.`
        },
    })
}
