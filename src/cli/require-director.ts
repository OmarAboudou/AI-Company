import type { CommandUnknownOpts } from "@commander-js/extra-typings"
import { readCurrentHumanId } from "../organization/human/read-current-human-id.ts"
import { UserError } from "../user-error.ts"

function formatCommandPath(actionCommand: CommandUnknownOpts): string {
    const names: string[] = []
    for (
        let command: CommandUnknownOpts | null = actionCommand;
        command;
        command = command.parent
    ) {
        names.unshift(command.name())
    }
    return names.join(" ")
}

export function requireDirector(
    _: unknown,
    actionCommand: CommandUnknownOpts,
): void {
    const currentHumanId = readCurrentHumanId()
    if (currentHumanId !== undefined) {
        throw new UserError(
            `Only directors run \`${formatCommandPath(actionCommand)}\`: LLMCO_CURRENT_HUMAN_ID has you act as "${currentHumanId}". Run \`llmco current-human clear\` to act as a director.`,
        )
    }
}
