import { join } from "node:path"
import { llmcoDir } from "./project.ts"

const gitignore = "# Created by llmco: its runtime state stays out of git.\n*\n"

export function stateDir(projectRoot: string): string {
    return join(llmcoDir(projectRoot), "state")
}

export async function writeState(
    projectRoot: string,
    path: string,
    state: object,
): Promise<void> {
    // The .gitignore first: git must never see a state file without it.
    await Bun.write(join(stateDir(projectRoot), ".gitignore"), gitignore)
    await Bun.write(path, `${JSON.stringify(state, null, 4)}\n`)
}
