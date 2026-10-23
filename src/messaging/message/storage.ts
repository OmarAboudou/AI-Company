import { join } from "node:path"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { readTextFile } from "../../files/read-text-file.ts"
import { saveJsonFile } from "../../files/save-json-file.ts"
import { getTicketFolderPath } from "../ticket/storage.ts"
import { type Message, MessageConfigSchema } from "./schema.ts"

function getMessagesFolderPath(
    projectRoot: string,
    ticketNumber: number,
): string {
    return join(getTicketFolderPath(projectRoot, ticketNumber), "messages")
}

function getMessagePaths(
    projectRoot: string,
    ticketNumber: number,
    id: string,
) {
    const messageFolderPath = join(
        getMessagesFolderPath(projectRoot, ticketNumber),
        id,
    )
    return {
        config: join(messageFolderPath, "message.json"),
        body: join(messageFolderPath, "body.md"),
    }
}

async function loadMessage(
    projectRoot: string,
    ticketNumber: number,
    id: string,
): Promise<Message> {
    const messagePaths = getMessagePaths(projectRoot, ticketNumber, id)
    const [config, body] = await Promise.all([
        readJsonFile(projectRoot, messagePaths.config, MessageConfigSchema),
        readTextFile(projectRoot, messagePaths.body),
    ])
    return { ticketNumber, id, ...config, body }
}

export async function listMessages(
    projectRoot: string,
    ticketNumber: number,
): Promise<Message[]> {
    const messageIds = await listSubdirectories(
        getMessagesFolderPath(projectRoot, ticketNumber),
    )
    return Promise.all(
        messageIds.map((id) => loadMessage(projectRoot, ticketNumber, id)),
    )
}

export async function saveMessage(
    projectRoot: string,
    message: Message,
): Promise<void> {
    const { ticketNumber, id, body, ...config } = message
    const messagePaths = getMessagePaths(projectRoot, ticketNumber, id)
    await Promise.all([
        saveJsonFile(messagePaths.config, config),
        Bun.write(messagePaths.body, body),
    ])
}
