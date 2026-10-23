import { UserError } from "../../user-error.ts"
import {
    type BuiltInToolName,
    builtInTools,
} from "../tool/built-in/built-in.ts"
import type { Tool } from "../tool/define-tool.ts"
import { getRunTools } from "./get-run-tools.ts"
import type { RunSession } from "./schema.ts"

function isBuiltInToolName(name: string): name is BuiltInToolName {
    return Object.hasOwn(builtInTools, name)
}

export function requireRunTools({
    toolNames,
    boundToolInputs,
}: RunSession): Record<string, Tool> {
    const unknownToolNames = toolNames.filter(
        (name) => !isBuiltInToolName(name),
    )
    if (unknownToolNames.length > 0) {
        throw new UserError(
            `The run gives tools this version of AICo doesn't know: ${unknownToolNames.join(", ")}. Update AICo to go on with it.`,
        )
    }
    return getRunTools(toolNames.filter(isBuiltInToolName), boundToolInputs)
}
