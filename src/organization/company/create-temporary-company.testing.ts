import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { savePosition } from "../position/storage.ts"
import { saveCompany } from "./storage.ts"

export async function createTemporaryCompany(): Promise<string> {
    const projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
    const directorPositionId = "director"
    await Promise.all([
        saveCompany(projectRoot, {
            name: "Acme",
            directorPositionId,
            description: "",
        }),
        savePosition(projectRoot, {
            id: directorPositionId,
            title: "Director",
            description: "",
        }),
    ])
    return projectRoot
}
