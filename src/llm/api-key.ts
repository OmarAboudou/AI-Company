import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { projectRoot } from "../cli-helpers.ts"
import { readTextFile } from "../files/read-text-file.ts"
import { isInRepositoryButNotIgnored } from "../git.ts"
import type { LlmProvider } from "../llm-provider/llm-provider.ts"
import { UserError } from "../user-error.ts"

function keyFilePath(path: string): string {
    if (path === "~" || path.startsWith("~/")) {
        return join(homedir(), path.slice(1))
    }
    return resolve(projectRoot, path)
}

export async function readApiKey(
    provider: LlmProvider,
): Promise<string | undefined> {
    const source = provider.apiKey
    if (source === undefined) {
        return undefined
    }
    if (source.kind === "env") {
        const key = process.env[source.variable]?.trim()
        if (key === undefined || key === "") {
            throw new UserError(
                `Provider "${provider.id}" reads its API key from the environment variable ${source.variable}, which isn't set.`,
            )
        }
        return key
    }
    const path = keyFilePath(source.path)
    if (isInRepositoryButNotIgnored(projectRoot, path)) {
        throw new UserError(
            `Provider "${provider.id}" reads its API key from ${source.path}, which is in the repository but not ignored by git: ignore it, or move it out of the repository.`,
        )
    }
    const key = (await readTextFile(projectRoot, path)).trim()
    if (key === "") {
        throw new UserError(
            `Provider "${provider.id}" reads its API key from ${source.path}, which is empty.`,
        )
    }
    return key
}
