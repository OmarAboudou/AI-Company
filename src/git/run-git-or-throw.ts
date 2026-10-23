import { spawnGit } from "./spawn-git.ts"

export function runGitOrThrow(folderPath: string, args: string[]): string {
    const gitProcess = spawnGit(folderPath, args)
    if (gitProcess.exitCode !== 0) {
        throw new Error(
            `git ${args.join(" ")} failed in ${folderPath}: ${gitProcess.stderr.toString()}`,
        )
    }
    return gitProcess.stdout.toString().trim()
}
