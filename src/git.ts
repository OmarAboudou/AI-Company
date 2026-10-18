import { UserError } from "./errors.ts"

function runGit(dir: string, args: string[]): string | undefined {
    try {
        const result = Bun.spawnSync(["git", ...args], { cwd: dir })
        return result.exitCode === 0
            ? result.stdout.toString().trim()
            : undefined
    } catch {
        throw new UserError("llmco needs git: install it, then try again.")
    }
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
