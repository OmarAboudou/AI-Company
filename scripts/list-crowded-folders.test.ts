import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join, relative } from "node:path"
import { listCrowdedFolders } from "./list-crowded-folders.ts"

const repositoryPath = join(import.meta.dir, "..")

test("no folder of src/ holds more than 15 source entries (see docs/architecture.md)", async () => {
    const srcPath = join(repositoryPath, "src")

    const crowdedFolders = await listCrowdedFolders(srcPath)

    const crowdedFolderCounts = crowdedFolders.map(
        ({ path, sourceEntryCount }) =>
            `${relative(repositoryPath, path)}: ${sourceEntryCount}`,
    )
    expect(crowdedFolderCounts).toEqual([])
})

describe("listCrowdedFolders", () => {
    let folderPath: string

    beforeEach(async () => {
        folderPath = await mkdtemp(join(tmpdir(), "llmco-"))
    })

    afterEach(async () => {
        await rm(folderPath, { recursive: true, force: true })
    })

    async function createFiles(subfolderPath: string, fileNames: string[]) {
        await Promise.all(
            fileNames.map((fileName) =>
                Bun.write(join(folderPath, subfolderPath, fileName), ""),
            ),
        )
    }

    function createFileNames(count: number): string[] {
        return Array.from({ length: count }, (_, index) => `file-${index}.ts`)
    }

    test("lists a folder of more than 15 files and subfolders", async () => {
        await createFiles("", createFileNames(14))
        await createFiles("subfolder", ["file.ts"])
        const before = await listCrowdedFolders(folderPath)
        await createFiles("", ["one-more.ts"])

        const after = await listCrowdedFolders(folderPath)

        expect(before).toEqual([])
        expect(after).toEqual([{ path: folderPath, sourceEntryCount: 16 }])
    })

    test("doesn't count the tests nor the file named after the folder", async () => {
        const eponymousFileName = `${basename(folderPath)}.ts`
        await createFiles("", [...createFileNames(15), "file-0.test.ts"])
        await createFiles("", [eponymousFileName])

        const crowdedFolders = await listCrowdedFolders(folderPath)

        expect(await readdir(folderPath)).toHaveLength(17)
        expect(crowdedFolders).toEqual([])
    })

    test("looks into every subfolder", async () => {
        await createFiles("commands/thread", createFileNames(16))

        const crowdedFolders = await listCrowdedFolders(folderPath)

        expect(crowdedFolders).toEqual([
            { path: join(folderPath, "commands/thread"), sourceEntryCount: 16 },
        ])
    })
})
