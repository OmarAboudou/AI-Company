import { appendFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { runGit } from "../run-git.ts"

const exclusionLine = ".aico/"

const exclusionText = `# Added by AICo: its data's worktree, on branch aico/data.\n${exclusionLine}\n`

function readExcludeFilePath(projectRoot: string): string {
    const excludeFilePath = runGit(projectRoot, [
        "rev-parse",
        "--path-format=absolute",
        "--git-path",
        "info/exclude",
    ])
    if (excludeFilePath === undefined) {
        throw new Error(`git found no repository in ${projectRoot}`)
    }
    return excludeFilePath
}

export async function excludeAicoFolder(projectRoot: string): Promise<void> {
    const excludeFilePath = readExcludeFilePath(projectRoot)
    const excludeFile = Bun.file(excludeFilePath)
    const text = (await excludeFile.exists()) ? await excludeFile.text() : ""
    if (text.split("\n").some((line) => line.trim() === exclusionLine)) {
        return
    }
    const separator = text === "" || text.endsWith("\n") ? "" : "\n"
    await mkdir(dirname(excludeFilePath), { recursive: true })
    await appendFile(excludeFilePath, `${separator}${exclusionText}`)
}
