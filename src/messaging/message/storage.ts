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

function messagesDir(projectRoot: string, threadId: string): string {
    return join(getThreadFolderPath(projectRoot, threadId), "messages")
}

function messagePaths(projectRoot: string, threadId: string, id: string) {
    const dir = join(messagesDir(projectRoot, threadId), id)
    return {
        config: join(dir, "message.json"),
        body: join(dir, "body.md"),
        response: join(dir, "response.json"),
    }
}

async function loadMessage(
    projectRoot: string,
    threadId: string,
    id: string,
): Promise<Message> {
    const paths = messagePaths(projectRoot, threadId, id)
    const [config, body] = await Promise.all([
        readJsonFile(projectRoot, paths.config, MessageConfigSchema),
        readTextFile(projectRoot, paths.body),
    ])
    return { threadId, id, ...config, body }
}

export async function listMessages(
    projectRoot: string,
    threadId: string,
): Promise<Message[]> {
    const ids = await listSubdirectories(messagesDir(projectRoot, threadId))
    return Promise.all(ids.map((id) => loadMessage(projectRoot, threadId, id)))
}

export async function saveMessage(
    projectRoot: string,
    message: Message,
): Promise<void> {
    const { threadId, id, body, ...config } = message
    const paths = messagePaths(projectRoot, threadId, id)
    await Promise.all([
        Bun.write(paths.config, `${JSON.stringify(config, null, 4)}\n`),
        Bun.write(paths.body, body),
    ])
}

export async function saveResponse(
    projectRoot: string,
    { threadId, id }: Pick<Message, "threadId" | "id">,
    response: ProviderResponse,
): Promise<void> {
    await Bun.write(
        messagePaths(projectRoot, threadId, id).response,
        `${JSON.stringify(response, null, 4)}\n`,
    )
}

export async function loadResponse(
    projectRoot: string,
    { threadId, id }: Pick<Message, "threadId" | "id">,
): Promise<ProviderResponse | undefined> {
    const path = messagePaths(projectRoot, threadId, id).response
    if (!(await Bun.file(path).exists())) {
        return undefined
    }
    return readJsonFile(projectRoot, path, ProviderResponseSchema)
}
