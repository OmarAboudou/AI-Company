import { readdir, stat } from "node:fs/promises"
import { type Dirent } from "node:fs"

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

async function readEntries(dirPath: string): Promise<Dirent[]> {
    try {
        return await readdir(dirPath, {
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

export async function readToolEntries(){}
export async function readDepartmentEntries(){}