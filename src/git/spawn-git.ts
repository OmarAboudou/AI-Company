import { UserError } from "../user-error.ts"

let repositoryVariableNames: string[] | undefined

function readRepositoryVariableNames(): string[] {
    const listing = Bun.spawnSync(["git", "rev-parse", "--local-env-vars"])
    return listing.stdout.toString().trim().split("\n")
}

// git hooks and `git rebase --exec` hand their commands GIT_DIR and related
// variables, while llmco names the repository it works on by its folder.
function readEnvironmentWithoutRepositoryVariables() {
    repositoryVariableNames ??= readRepositoryVariableNames()
    const environment = { ...process.env }
    for (const name of repositoryVariableNames) {
        delete environment[name]
    }
    return environment
}

export function spawnGit(folderPath: string, args: string[]) {
    try {
        return Bun.spawnSync(["git", ...args], {
            cwd: folderPath,
            env: readEnvironmentWithoutRepositoryVariables(),
        })
    } catch {
        throw new UserError("llmco needs git: install it, then try again.")
    }
}
