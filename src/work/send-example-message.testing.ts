import { readGitCommitter } from "../git/read-git-committer.ts"
import { loadJournal } from "../journal/storage.ts"
import type { Message } from "../messaging/message/schema.ts"
import { sendUnsentMessage } from "../messaging/message/send-unsent-message.ts"
import { loadPosition } from "../organization/position/storage.ts"
import { dispatchEvents } from "./listener/dispatch-events.ts"
import type { Task } from "./task/schema.ts"
import type { WorkCatalog } from "./work-catalog.ts"

export type SendExampleMessageResult = {
    message: Message
    createdTasks: Task[]
}

// A person writes, outside any run, then the catalog's listeners hear of
// it, as they would at the next step of aico run or task work.
export async function sendExampleMessage(
    projectRoot: string,
    ticketNumber: number,
    body: string,
    catalog: WorkCatalog,
    { positionId = "founder" }: { positionId?: string } = {},
): Promise<SendExampleMessageResult> {
    const [journal, position] = await Promise.all([
        loadJournal(projectRoot),
        loadPosition(projectRoot, positionId),
    ])
    const unsentMessage = {
        position: { id: position.id, title: position.title },
        committer: readGitCommitter(projectRoot),
        body,
    }
    const message = await sendUnsentMessage(
        journal,
        ticketNumber,
        unsentMessage,
        { depth: 0 },
    )
    const { createdTasks } = await dispatchEvents(journal, catalog)
    return { message, createdTasks }
}
