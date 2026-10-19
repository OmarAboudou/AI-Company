import { spawnGit } from "./spawn-git.ts"

export function runGit(folderPath: string, args: string[]): string | undefined {
    const gitProcess = spawnGit(folderPath, args)
    return gitProcess.exitCode === 0
        ? gitProcess.stdout.toString().trim()
        : undefined
}
