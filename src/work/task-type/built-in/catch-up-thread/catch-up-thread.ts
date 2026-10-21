import { getEventOfType } from "../../../../journal/get-event-of-type.ts"
import { listEvents } from "../../../../journal/storage.ts"
import { messageSentEventType } from "../../../../messaging/message/schema.ts"
import { listMessages } from "../../../../messaging/message/storage.ts"
import { getMemberIds } from "../../../../messaging/thread/get-member-ids.ts"
import { loadThread } from "../../../../messaging/thread/storage.ts"
import { listPositions } from "../../../../organization/position/storage.ts"
import { listTasks } from "../../../task/storage.ts"
import { defineTaskType } from "../../define-task-type.ts"
import { buildCatchUpMessage } from "./build-catch-up-message.ts"
import { getLastEntryIdReadByRun } from "./get-last-entry-id-read-by-run.ts"
import { getLastReadEntryId } from "./get-last-read-entry-id.ts"
import {
    CatchUpThreadParamsSchema,
    CatchUpThreadResultSchema,
    catchUpThreadTypeName,
} from "./schema.ts"

export const catchUpThreadTaskType = defineTaskType({
    type: catchUpThreadTypeName,
    paramsSchema: CatchUpThreadParamsSchema,
    resultSchema: CatchUpThreadResultSchema,
    async createSession({ threadId }, { projectRoot, position, causeEvent }) {
        const [thread, messages, tasks, events, positions] = await Promise.all([
            loadThread(projectRoot, threadId),
            listMessages(projectRoot, threadId),
            listTasks(projectRoot),
            listEvents(projectRoot),
            listPositions(projectRoot),
        ])
        const lastReadEntryId = getLastReadEntryId(tasks, events, positions, {
            positionId: position.id,
            threadId,
        })
        const readCount =
            lastReadEntryId === undefined
                ? 0
                : messages.filter(({ id }) => id <= lastReadEntryId).length
        const causeMessageSentEvent = getEventOfType(
            causeEvent,
            messageSentEventType,
        )
        if (causeMessageSentEvent?.threadId === threadId) {
            const causeMessageIndex = messages.findIndex(
                ({ id }) => id === causeMessageSentEvent.messageId,
            )
            if (causeMessageIndex === -1) {
                const summary =
                    "Nothing to read: the message that asked was never written, its sending having stopped halfway."
                return { kind: "done", summary, result: {} }
            }
            if (causeMessageIndex < readCount) {
                const summary = `Already read: an earlier task read the thread up to entry #${readCount}.`
                return { kind: "done", summary, result: {} }
            }
        }
        const lastMessage = messages.at(-1)
        if (lastMessage === undefined || readCount === messages.length) {
            const summary = `Nothing new: the thread was read up to its last entry, #${readCount}.`
            return { kind: "done", summary, result: {} }
        }
        const memberIds = getMemberIds(thread, messages, positions)
        return {
            kind: "run",
            userMessage: buildCatchUpMessage({
                thread,
                memberIds,
                messages,
                readCount,
            }),
            toolNames: ["message_send", "thread_show"],
            boundToolInputs: {
                message_send: { threadId },
                thread_show: { threadId },
            },
            result: { lastReadEntryId: lastMessage.id },
        }
    },
    async getRunResult(
        { threadId },
        { runId, sessionResult },
        { projectRoot },
    ) {
        const { lastReadEntryId } = sessionResult
        if (lastReadEntryId === undefined) {
            return sessionResult
        }
        const [threadMessages, events] = await Promise.all([
            listMessages(projectRoot, threadId),
            listEvents(projectRoot),
        ])
        return {
            lastReadEntryId: getLastEntryIdReadByRun(threadMessages, events, {
                runId,
                lastShownEntryId: lastReadEntryId,
            }),
        }
    },
})
