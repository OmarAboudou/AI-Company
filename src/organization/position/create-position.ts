import { parseId } from "../../ids/parse-id.ts"
import { parseConfig } from "../../parse-config.ts"
import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { type Position, PositionConfigSchema } from "./schema.ts"
import { hasPosition, savePosition } from "./storage.ts"

export async function createPosition(
    projectRoot: string,
    rawId: string,
    { title, description }: { title: string; description: string },
): Promise<Position> {
    await requireCompany(projectRoot)
    const id = parseId("position", rawId)
    if (await hasPosition(projectRoot, id)) {
        throw new UserError(`Position "${id}" already exists.`)
    }
    const config = parseConfig(PositionConfigSchema, { title })
    const position = {
        id,
        ...config,
        createdAt: new Date().toISOString(),
        description,
    }
    await savePosition(projectRoot, position)
    return position
}
