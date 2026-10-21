import { describe, expect, test } from "bun:test"
import type { CommandUnknownOpts } from "@commander-js/extra-typings"
import { createProgram } from "../../program.ts"
import { shellCodeCommands } from "./shell-code-commands.ts"

function getCommandNames(command: CommandUnknownOpts): string[] {
    return [command.name(), ...command.aliases()]
}

function listShellCodeCommands(command: CommandUnknownOpts): string[] {
    return command.commands.flatMap((subcommand) => {
        const subcommandNames = getCommandNames(subcommand)
        if (subcommand.options.some(({ long }) => long === "--shell-code")) {
            return subcommandNames
        }
        return listShellCodeCommands(subcommand).flatMap((leafCommand) =>
            subcommandNames.map((name) => `${name} ${leafCommand}`),
        )
    })
}

describe("shellCodeCommands", () => {
    test("lists every command printing shell code, under each of its names", () => {
        const programShellCodeCommands = listShellCodeCommands(createProgram())

        expect(programShellCodeCommands.sort()).toEqual(
            [...shellCodeCommands].sort(),
        )
    })
})
