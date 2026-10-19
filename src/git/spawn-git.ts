import { UserError } from "../user-error.ts"

export function spawnGit(folderPath: string, args: string[]) {
    try {
        return Bun.spawnSync(["git", ...args], { cwd: folderPath })
    } catch {
        throw new UserError("llmco needs git: install it, then try again.")
    }
}
