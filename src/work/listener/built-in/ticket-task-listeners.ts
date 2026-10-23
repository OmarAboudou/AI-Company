import {
    deliveryRefusedEventType,
    questionAnsweredEventType,
    questionAskedEventType,
    ticketDeliveredEventType,
    ticketHandedOverEventType,
} from "../../../messaging/ticket/act/schema.ts"
import { ticketCreatedEventType } from "../../../messaging/ticket/schema.ts"
import { answerTaskType } from "../../task-type/built-in/answer/answer.ts"
import { handleTaskType } from "../../task-type/built-in/handle/handle.ts"
import { resumeTaskType } from "../../task-type/built-in/resume/resume.ts"
import { validateTaskType } from "../../task-type/built-in/validate/validate.ts"
import { createUncreatedTask } from "../../task-type/create-uncreated-task.ts"
import { defineListener, type Listener } from "../define-listener.ts"

const ticketTaskRules = [
    {
        eventType: ticketCreatedEventType,
        taskType: handleTaskType,
        recipientRole: "assignee",
    },
    {
        eventType: questionAskedEventType,
        taskType: answerTaskType,
        recipientRole: "requester",
    },
    {
        eventType: questionAnsweredEventType,
        taskType: resumeTaskType,
        recipientRole: "assignee",
    },
    {
        eventType: ticketDeliveredEventType,
        taskType: validateTaskType,
        recipientRole: "requester",
    },
    {
        eventType: deliveryRefusedEventType,
        taskType: resumeTaskType,
        recipientRole: "assignee",
    },
    {
        eventType: ticketHandedOverEventType,
        taskType: handleTaskType,
        recipientRole: "assignee",
    },
] as const

export const ticketTaskListeners: Listener[] = ticketTaskRules.map(
    ({ eventType, taskType, recipientRole }) =>
        defineListener({
            eventType,
            getEffects: ({ ticketNumber }, { ticketStates }) => {
                const state = ticketStates.get(ticketNumber)
                if (state === undefined || state.status === "closed") {
                    return []
                }
                const positionId =
                    recipientRole === "requester"
                        ? state.requesterPositionId
                        : state.assigneePositionId
                const task = createUncreatedTask(taskType, {
                    positionId,
                    params: { ticketNumber },
                })
                return [{ kind: "create-task", task }]
            },
        }),
)
