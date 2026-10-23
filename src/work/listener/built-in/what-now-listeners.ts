import { companyCreatedEventType } from "../../../organization/company/schema.ts"
import { getTaskPositionId } from "../../task/get-task-position-id.ts"
import { isPendingTask } from "../../task/is-pending-task.ts"
import {
    taskCancelledEventType,
    taskDoneEventType,
    taskFailedEventType,
} from "../../task/schema.ts"
import { whatNowTaskType } from "../../task-type/built-in/what-now/what-now.ts"
import { createUncreatedTask } from "../../task-type/create-uncreated-task.ts"
import {
    defineListener,
    type Listener,
    type ListenerContext,
    type ListenerEffect,
} from "../define-listener.ts"

// An init run again after an interruption creates the company twice: the
// founder never gets a second What now? while one is pending.
function giveWhatNow(
    positionId: string,
    { tasks, taskStates }: ListenerContext,
): ListenerEffect[] {
    const hasPendingWhatNow = tasks.some(
        (task) =>
            task.type === whatNowTaskType.type &&
            isPendingTask(task, taskStates),
    )
    if (hasPendingWhatNow) {
        return []
    }
    const task = createUncreatedTask(whatNowTaskType, {
        positionId,
        params: {},
    })
    return [{ kind: "create-task", task }]
}

export const whatNowListeners: Listener[] = [
    defineListener({
        eventType: companyCreatedEventType,
        getEffects: (_event, ctx) => giveWhatNow(ctx.founderPositionId, ctx),
    }),
    ...[taskDoneEventType, taskFailedEventType, taskCancelledEventType].map(
        (eventType) =>
            defineListener({
                eventType,
                getEffects: ({ taskId }, ctx) => {
                    const task = ctx.tasks.find(({ id }) => id === taskId)
                    return task?.type === whatNowTaskType.type
                        ? giveWhatNow(
                              getTaskPositionId(task, ctx.positions),
                              ctx,
                          )
                        : []
                },
            }),
    ),
]
