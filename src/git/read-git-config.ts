import { runGit } from "./run-git.ts"

export function readGitConfig(
    repositoryPath: string,
    key: string,
): string | undefined {
    const value = runGit(repositoryPath, ["config", key])
    return value === "" ? undefined : value
}
