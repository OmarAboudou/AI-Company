import { join } from "node:path"
import { jsonSchemas } from "./json-schemas.ts"

const schemasFolderPath = join(import.meta.dir, "..", "schemas")

await Promise.all(
    Object.entries(jsonSchemas).map(([name, jsonSchema]) =>
        Bun.write(
            join(schemasFolderPath, `${name}.json`),
            JSON.stringify(jsonSchema),
        ),
    ),
)

const formatting = Bun.spawnSync(
    ["biome", "format", "--write", schemasFolderPath],
    {
        stdio: ["inherit", "inherit", "inherit"],
    },
)
process.exitCode = formatting.exitCode
