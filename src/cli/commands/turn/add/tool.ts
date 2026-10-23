import { type Command, Option } from "@commander-js/extra-typings"
import { addTurnTool } from "../../../../work/turn/add-turn-tool.ts"
import { projectRoot } from "../../../project-root.ts"
import { readTextOrFile } from "../../../read-text-or-file.ts"

export function registerTurnAddToolCommand(turnAddCommand: Command): void {
    turnAddCommand
        .command("tool")
        .description(
            "Add a call to one of your task's tools to your next turn: task next shows them, with their inputs.",
        )
        .argument("<tool-name>", "name of the tool, e.g. message_send")
        .addOption(
            new Option(
                "-i, --input <json>",
                `the tool's input, a JSON object, e.g. '{"body": "Hello."}'; {} when absent`,
            ),
        )
        .addOption(
            new Option(
                "-F, --input-file <path>",
                "read the input from a file, or from stdin with -",
            ).conflicts("input"),
        )
        .action(async (toolName, options) => {
            const rawInput =
                (await readTextOrFile(options.input, options.inputFile)) ?? "{}"
            await addTurnTool(projectRoot, process.env, { toolName, rawInput })
            console.error(
                `Added a call to ${toolName} to your turn. Send it with \`aico turn send\`.`,
            )
        })
}
