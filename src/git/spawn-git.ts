import { UserError } from "../user-error.ts"

export function spawnGit(dir: string, args: string[]) {
    try {
        return Bun.spawnSync(["git", ...args], { cwd: dir })
    } catch {
        throw new UserError("llmco needs git: install it, then try again.")
    }
}
