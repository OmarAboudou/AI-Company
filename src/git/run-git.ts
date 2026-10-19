import { spawnGit } from "./spawn-git.ts"

export function runGit(dir: string, args: string[]): string | undefined {
    const result = spawnGit(dir, args)
    return result.exitCode === 0 ? result.stdout.toString().trim() : undefined
}
