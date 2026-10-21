import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { listFoldersWithoutReadme } from "./list-folders-without-readme.ts"

const repositoryPath = join(import.meta.dir, "..")

test("every folder under src/ has a README.md (see docs/architecture.md)", async () => {
    const srcPath = join(repositoryPath, "src")

    const foldersWithoutReadme = await listFoldersWithoutReadme(srcPath)

    const relativePaths = foldersWithoutReadme.map((path) =>
        relative(repositoryPath, path),
    )
    expect(relativePaths).toEqual([])
})

describe("listFoldersWithoutReadme", () => {
    let folderPath: string

    beforeEach(async () => {
        folderPath = await mkdtemp(join(tmpdir(), "llmco-"))
    })

    afterEach(async () => {
        await rm(folderPath, { recursive: true, force: true })
    })

    async function createFile(filePath: string) {
        await Bun.write(join(folderPath, filePath), "")
    }

    test("lists the folders without a README.md, at any depth", async () => {
        await createFile("work/README.md")
        await createFile("work/task/create-task.ts")
        await createFile("organization/position/README.md")

        const foldersWithoutReadme = await listFoldersWithoutReadme(folderPath)

        expect(foldersWithoutReadme).toEqual([
            join(folderPath, "organization"),
            join(folderPath, "work/task"),
        ])
    })

    test("doesn't list the folder it is given", async () => {
        await createFile("work/README.md")
        const readmePath = join(folderPath, "README.md")
        const hasReadme = await Bun.file(readmePath).exists()

        const foldersWithoutReadme = await listFoldersWithoutReadme(folderPath)

        expect(hasReadme).toBe(false)
        expect(foldersWithoutReadme).toEqual([])
    })
})
