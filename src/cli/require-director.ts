import type { CommandUnknownOpts } from "@commander-js/extra-typings"
import { employeeIdFromEnvironment } from "../organization/human/read-current-human-id.ts"
import { UserError } from "../user-error.ts"

function commandPath(command: CommandUnknownOpts): string {
    const names: string[] = []
    for (
        let next: CommandUnknownOpts | null = command;
        next;
        next = next.parent
    ) {
        names.unshift(next.name())
    }
    return names.join(" ")
}

export function requireDirector(
    _: unknown,
    actionCommand: CommandUnknownOpts,
): void {
    const id = employeeIdFromEnvironment()
    if (id !== undefined) {
        throw new UserError(
            `Only directors run \`${commandPath(actionCommand)}\`: LLMCO_CURRENT_HUMAN_ID has you act as "${id}". Unset it to act as a director.`,
        )
    }
}
