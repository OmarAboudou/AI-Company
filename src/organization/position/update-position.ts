import { parseConfig } from "../../parse-config.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import { type Position, PositionConfigSchema } from "./schema.ts"
import { savePosition } from "./storage.ts"

export async function updatePosition(
    projectRoot: string,
    rawId: string,
    changes: { title?: string; description?: string },
): Promise<Position> {
    await requireCompany(projectRoot)
    const { id, description, createdAt, formerIds, ...config } =
        await loadExistingPosition(projectRoot, rawId)
    const updatedConfig = parseConfig(PositionConfigSchema, {
        ...config,
        title: changes.title ?? config.title,
    })
    const updatedPosition = {
        id,
        ...updatedConfig,
        createdAt,
        formerIds,
        description: changes.description ?? description,
    }
    await savePosition(projectRoot, updatedPosition)
    return updatedPosition
}
