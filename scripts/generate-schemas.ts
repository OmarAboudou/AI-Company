import { join } from "node:path"
import { jsonSchemas } from "./json-schemas.ts"

const dir = join(import.meta.dir, "..", "schemas")

await Promise.all(
    Object.entries(jsonSchemas).map(([name, jsonSchema]) =>
        Bun.write(join(dir, `${name}.json`), JSON.stringify(jsonSchema)),
    ),
)

const format = Bun.spawnSync(["biome", "format", "--write", dir], {
    stdio: ["inherit", "inherit", "inherit"],
})
process.exitCode = format.exitCode
