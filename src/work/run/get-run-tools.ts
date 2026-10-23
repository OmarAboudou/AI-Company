import type { BoundToolInputs } from "../task-type/define-task-type.ts"
import { bindTool } from "../tool/bind-tool.ts"
import {
    type BuiltInToolName,
    builtInTools,
} from "../tool/built-in/built-in.ts"
import type { Tool } from "../tool/define-tool.ts"

export function getRunTools(
    toolNames: BuiltInToolName[],
    boundToolInputs: BoundToolInputs = {},
): Record<string, Tool> {
    return Object.fromEntries(
        toolNames.map((name) => {
            const tool: Tool = builtInTools[name]
            return [name, bindTool(tool, boundToolInputs[name] ?? {})]
        }),
    )
}
