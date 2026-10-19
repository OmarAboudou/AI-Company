import { runGit } from "./run-git.ts"

export function gitConfig(dir: string, key: string): string | undefined {
    const value = runGit(dir, ["config", key])
    return value === "" ? undefined : value
}
