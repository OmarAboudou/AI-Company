import { z } from "zod"
import { IdSchema } from "../ids/id-schema.ts"
import { messageSentEventType } from "../messaging/message/schema.ts"
import { TicketNumberSchema } from "../messaging/ticket/schema.ts"
import {
    defineListener,
    type ListenerEffect,
} from "./listener/define-listener.ts"
import { createUncreatedTask } from "./task-type/create-uncreated-task.ts"
import { defineTaskType } from "./task-type/define-task-type.ts"
import type { WorkCatalog } from "./work-catalog.ts"

// The engine's tests run tasks of this type rather than of AICo's own, so
// that they test the engine, whatever AICo's task types do.
export const exampleTaskType = defineTaskType({
    type: "example",
    paramsSchema: z.strictObject({
        ticketNumber: TicketNumberSchema,
        doneSummary: z.string().optional(),
    }),
    resultSchema: z.strictObject({ runId: IdSchema.optional() }),
    async createSession({ ticketNumber, doneSummary }) {
        if (doneSummary !== undefined) {
            return { kind: "done", summary: doneSummary, result: {} }
        }
        return {
            kind: "run",
            userMessage: `Answer the last message of ticket #${ticketNumber}.`,
            toolNames: ["message_send", "ticket_show"],
            boundToolInputs: {
                message_send: { ticketNumber },
                ticket_show: { ticketNumber },
            },
            result: {},
        }
    },
    async getRunResult(_params, { runId }) {
        return { runId }
    },
})

export function createExampleWorkCatalog(
    askedPositionIds: string[] = [],
): WorkCatalog {
    const exampleListener = defineListener({
        eventType: messageSentEventType,
        getEffects: ({ ticketNumber, positionId }) =>
            askedPositionIds
                .filter((askedPositionId) => askedPositionId !== positionId)
                .map(
                    (askedPositionId): ListenerEffect => ({
                        kind: "create-task",
                        task: createUncreatedTask(exampleTaskType, {
                            positionId: askedPositionId,
                            params: { ticketNumber },
                        }),
                    }),
                ),
    })
    return {
        taskTypes: { [exampleTaskType.type]: exampleTaskType },
        listeners: [exampleListener],
    }
}
