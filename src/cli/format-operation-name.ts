import type { CommandUnknownOpts } from "@commander-js/extra-typings"

function getCommandNames(command: CommandUnknownOpts): string[] {
    return command.parent === null
        ? [command.name()]
        : [...getCommandNames(command.parent), command.name()]
}

export function formatOperationName(command: CommandUnknownOpts): string {
    return [...getCommandNames(command), ...command.args].join(" ")
}
