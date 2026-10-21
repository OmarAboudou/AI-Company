import { getCurrentId } from "../../ids/get-current-id.ts"
import type { EventOfType } from "../../journal/schema.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { getTaskPositionId } from "../task/get-task-position-id.ts"
import { isPendingTask } from "../task/is-pending-task.ts"
import type { Task } from "../task/schema.ts"
import { catchUpThreadTaskType } from "../task-type/built-in/catch-up-thread/catch-up-thread.ts"
import { createUncreatedTask } from "../task-type/create-uncreated-task.ts"
import {
    defineListener,
    type ListenerContext,
    type ListenerEffect,
} from "./define-listener.ts"

type MessageSentEvent = EventOfType<typeof messageSentEventType>

// A message sent in a run ends only that run's task: the position's other
// catch-ups of the thread find their cause already read when they run.
function getCatchUpsEndedByWriting(
    { id, occurredAt, threadId, positionId, runId }: MessageSentEvent,
    { tasks, taskStates, positions }: ListenerContext,
): Task[] {
    if (runId !== undefined) {
        return []
    }
    const writerPositionId = getCurrentId(positions, positionId, occurredAt)
    return tasks.filter(
        (task) =>
            task.type === catchUpThreadTaskType.type &&
            task.params.threadId === threadId &&
            task.causeEventId < id &&
            getTaskPositionId(task, positions) === writerPositionId &&
            isPendingTask(task, taskStates),
    )
}

export const catchUpListener = defineListener({
    eventType: messageSentEventType,
    getEffects: (event, ctx): ListenerEffect[] => [
        ...getCatchUpsEndedByWriting(event, ctx).map(
            (task): ListenerEffect => ({
                kind: "mark-task-as-done",
                taskId: task.id,
                summary: "Sent a message in the thread.",
                result: { lastReadEntryId: event.messageId },
            }),
        ),
        ...event.mentions.map(
            (positionId): ListenerEffect => ({
                kind: "create-task",
                task: createUncreatedTask(catchUpThreadTaskType, {
                    positionId,
                    params: { threadId: event.threadId },
                }),
            }),
        ),
    ],
})
