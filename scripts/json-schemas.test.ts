import { expect, test } from "bun:test"
import { join } from "node:path"
import { jsonSchemas } from "./json-schemas.ts"

test.each(Object.entries(jsonSchemas))(
    "schemas/%s.json is up to date (run `bun run schemas` otherwise)",
    async (name, jsonSchema) => {
        const path = join(import.meta.dir, "..", "schemas", `${name}.json`)

        expect(await Bun.file(path).json()).toEqual(jsonSchema)
    },
)
