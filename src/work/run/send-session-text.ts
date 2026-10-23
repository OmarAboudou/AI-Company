import { runOperation } from "../../git/reserved-branch/run-operation.ts"
import { createUnsentMessage } from "../../messaging/message/create-unsent-message.ts"
import { sendUnsentMessage } from "../../messaging/message/send-unsent-message.ts"
import type { ToolContext } from "../tool/define-tool.ts"
import { readCallAuthor } from "../tool/read-call-author.ts"

export async function sendSessionText(
    text: string,
    ctx: ToolContext,
): Promise<void> {
    const { ticketNumber } = ctx.task.params
    if (typeof ticketNumber !== "number" || text.trim() === "") {
        return
    }
    const unsentMessage = createUnsentMessage(readCallAuthor(ctx), text)
    await runOperation(ctx.projectRoot, `text in task ${ctx.task.id}`, () =>
        sendUnsentMessage(ctx.journal, ticketNumber, unsentMessage, {
            depth: ctx.depth,
            runId: ctx.runId,
        }),
    )
}
