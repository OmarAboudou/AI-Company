import { join } from "node:path"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { readTextFile } from "../../files/read-text-file.ts"
import { getThreadFolderPath } from "../thread/storage.ts"
import {
    type Message,
    MessageConfigSchema,
    type ProviderResponse,
    ProviderResponseSchema,
} from "./schema.ts"

function getMessagesFolderPath(projectRoot: string, threadId: string): string {
    return join(getThreadFolderPath(projectRoot, threadId), "messages")
}

function getMessagePaths(projectRoot: string, threadId: string, id: string) {
    const messageFolderPath = join(
        getMessagesFolderPath(projectRoot, threadId),
        id,
    )
    return {
        config: join(messageFolderPath, "message.json"),
        body: join(messageFolderPath, "body.md"),
        response: join(messageFolderPath, "response.json"),
    }
}

async function loadMessage(
    projectRoot: string,
    threadId: string,
    id: string,
): Promise<Message> {
    const messagePaths = getMessagePaths(projectRoot, threadId, id)
    const [config, body] = await Promise.all([
        readJsonFile(projectRoot, messagePaths.config, MessageConfigSchema),
        readTextFile(projectRoot, messagePaths.body),
    ])
    return { threadId, id, ...config, body }
}

export async function listMessages(
    projectRoot: string,
    threadId: string,
): Promise<Message[]> {
    const messageIds = await listSubdirectories(
        getMessagesFolderPath(projectRoot, threadId),
    )
    return Promise.all(
        messageIds.map((id) => loadMessage(projectRoot, threadId, id)),
    )
}

export async function saveMessage(
    projectRoot: string,
    message: Message,
): Promise<void> {
    const { threadId, id, body, ...config } = message
    const messagePaths = getMessagePaths(projectRoot, threadId, id)
    await Promise.all([
        Bun.write(messagePaths.config, `${JSON.stringify(config, null, 4)}\n`),
        Bun.write(messagePaths.body, body),
    ])
}

export async function saveProviderResponse(
    projectRoot: string,
    { threadId, id }: Pick<Message, "threadId" | "id">,
    response: ProviderResponse,
): Promise<void> {
    await Bun.write(
        getMessagePaths(projectRoot, threadId, id).response,
        `${JSON.stringify(response, null, 4)}\n`,
    )
}

export async function loadProviderResponse(
    projectRoot: string,
    { threadId, id }: Pick<Message, "threadId" | "id">,
): Promise<ProviderResponse | undefined> {
    const path = getMessagePaths(projectRoot, threadId, id).response
    if (!(await Bun.file(path).exists())) {
        return undefined
    }
    return readJsonFile(projectRoot, path, ProviderResponseSchema)
}
