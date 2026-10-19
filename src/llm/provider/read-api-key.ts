import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { readTextFile } from "../../files/read-text-file.ts"
import { isInRepositoryButNotIgnored } from "../../git/is-in-repository-but-not-ignored.ts"
import { UserError } from "../../user-error.ts"
import type { LlmProvider } from "./schema.ts"

function getKeyFilePath(projectRoot: string, path: string): string {
    if (path === "~" || path.startsWith("~/")) {
        return join(homedir(), path.slice(1))
    }
    return resolve(projectRoot, path)
}

export async function readApiKey(
    projectRoot: string,
    provider: LlmProvider,
): Promise<string | undefined> {
    const apiKeySource = provider.apiKey
    if (apiKeySource === undefined) {
        return undefined
    }
    if (apiKeySource.kind === "env") {
        const apiKey = process.env[apiKeySource.variable]?.trim()
        if (apiKey === undefined || apiKey === "") {
            throw new UserError(
                `Provider "${provider.id}" reads its API key from the environment variable ${apiKeySource.variable}, which isn't set.`,
            )
        }
        return apiKey
    }
    const path = getKeyFilePath(projectRoot, apiKeySource.path)
    if (isInRepositoryButNotIgnored(projectRoot, path)) {
        throw new UserError(
            `Provider "${provider.id}" reads its API key from ${apiKeySource.path}, which is in the repository but not ignored by git: ignore it, or move it out of the repository.`,
        )
    }
    const apiKey = (await readTextFile(projectRoot, path)).trim()
    if (apiKey === "") {
        throw new UserError(
            `Provider "${provider.id}" reads its API key from ${apiKeySource.path}, which is empty.`,
        )
    }
    return apiKey
}
