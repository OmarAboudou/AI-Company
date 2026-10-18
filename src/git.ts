import { UserError } from "./errors.ts"

function spawnGit(dir: string, args: string[]) {
    try {
        return Bun.spawnSync(["git", ...args], { cwd: dir })
    } catch {
        throw new UserError("llmco needs git: install it, then try again.")
    }
}

function runGit(dir: string, args: string[]): string | undefined {
    const result = spawnGit(dir, args)
    return result.exitCode === 0 ? result.stdout.toString().trim() : undefined
}

export function requireGitRepository(dir: string): void {
    if (runGit(dir, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
        throw new UserError(
            "llmco works inside a git repository. Run `git init` first.",
        )
    }
}

export function gitConfig(dir: string, key: string): string | undefined {
    const value = runGit(dir, ["config", key])
    return value === "" ? undefined : value
}

export function isInRepositoryButNotIgnored(
    dir: string,
    path: string,
): boolean {
    return spawnGit(dir, ["check-ignore", "-q", path]).exitCode === 1
}
