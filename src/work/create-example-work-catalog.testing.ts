import { z } from "zod"
import { IdSchema } from "../ids/id-schema.ts"
import { messageSentEventType } from "../messaging/message/schema.ts"
import { listMessages } from "../messaging/message/storage.ts"
import { TicketNumberSchema } from "../messaging/ticket/schema.ts"
import {
    defineListener,
    type ListenerEffect,
} from "./listener/define-listener.ts"
import { createUncreatedTask } from "./task-type/create-uncreated-task.ts"
import { defineTaskType } from "./task-type/define-task-type.ts"
import type { WorkCatalog } from "./work-catalog.ts"

// The engine's tests run tasks of this type rather than of AICo's own, so
// that they test the engine, whatever AICo's task types do. Its task
// becomes pointless once its ticket's discussion says "Stop.", which lets
// a test stop it before it starts or between two steps.
export const exampleTaskType = defineTaskType({
    type: "example",
    paramsSchema: z.strictObject({ ticketNumber: TicketNumberSchema }),
    resultSchema: z.strictObject({ runId: IdSchema.optional() }),
    async createSession({ ticketNumber }) {
        return {
            userMessage: `Answer the last message of ticket #${ticketNumber}.`,
            toolNames: ["ticket_deliver", "ticket_show"],
            boundToolInputs: {
                ticket_deliver: { ticketNumber },
                ticket_show: { ticketNumber },
            },
            result: {},
        }
    },
    async getRunResult(_params, { runId }) {
        return { runId }
    },
    async getCancellationReason({ ticketNumber }, { projectRoot }) {
        const messages = await listMessages(projectRoot, ticketNumber)
        return messages.some(({ body }) => body === "Stop.")
            ? `Ticket #${ticketNumber}'s discussion says Stop.`
            : undefined
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
