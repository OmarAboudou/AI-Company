import { join } from "node:path"
import { runOperation } from "./run-operation.ts"

// Run by the tests as a process of its own, to run an operation alongside
// those of other processes: it writes two files, a while apart.
const [projectRoot = "", operationName = ""] = process.argv.slice(2)
await runOperation(projectRoot, operationName, async () => {
    const aicoFolderPath = join(projectRoot, ".aico")
    await Bun.write(join(aicoFolderPath, `${operationName}-1.md`), "")
    await Bun.sleep(20)
    await Bun.write(join(aicoFolderPath, `${operationName}-2.md`), "")
})
