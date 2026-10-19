import { z } from "zod"
import { UserError } from "../../user-error.ts"
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
    const validation = PositionConfigSchema.safeParse({
        ...config,
        title: changes.title ?? config.title,
    })
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    const updatedPosition = {
        id,
        ...validation.data,
        createdAt,
        formerIds,
        description: changes.description ?? description,
    }
    await savePosition(projectRoot, updatedPosition)
    return updatedPosition
}
