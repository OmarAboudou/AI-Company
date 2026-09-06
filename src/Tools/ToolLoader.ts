import type ApplicationConfig from "../ApplicationConfig"
import { readdir, stat } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import { join, resolve } from "node:path"
import { type ToolDefinition, isToolDefinition } from "./Tool"
import { type Dirent } from "node:fs"

const TOOL_DIRECTORY = "Tools"

export async function loadTools(
    appConfig: ApplicationConfig,
): Promise<ToolDefinition[]> {
    await checkCompanyDir(appConfig.companyRootDir)
    const toolDirPath = join(appConfig.companyRootDir, TOOL_DIRECTORY)
    const entries = await readToolEntries(toolDirPath)
    const tsFiles = entries.filter(
        (entry) => entry.isFile() && entry.name.endsWith(".ts"),
    )
    const result: ToolDefinition[] = []
    for (const tsFile of tsFiles) {
        const fileUrl = pathToFileURL(resolve(tsFile.parentPath, tsFile.name))
        const toolDefinition: unknown = (await import(fileUrl.href)).default
        if (!isToolDefinition(toolDefinition)) {
            throw new Error(
                `${fileUrl.pathname} does not export a valid tool as default`,
            )
        }
        result.push(toolDefinition)
    }
    return result
}

async function checkCompanyDir(companyDirPath: string) {
    const companyDirStats = await stat(companyDirPath).catch((e) => {
        if (isEntryMissingError(e)) {
            throw new Error(
                `Company root directory ${companyDirPath} does not exist.`,
                { cause: e },
            )
        }
        throw e
    })
    if (!companyDirStats.isDirectory()) {
        throw new Error(
            `Company directory path ${companyDirPath} is not a directory.`,
        )
    }
}

async function readToolEntries(toolDirPath: string): Promise<Dirent[]> {
    try {
        return await readdir(toolDirPath, {
            withFileTypes: true,
            recursive: true,
        })
    } catch (e) {
        if (isEntryMissingError(e)) {
            return []
        }
        throw e
    }
}

function isEntryMissingError(e: unknown): boolean {
    return e instanceof Error && "code" in e && e.code === "ENOENT"
}
