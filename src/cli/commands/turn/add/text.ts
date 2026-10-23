import { type Command, Option } from "@commander-js/extra-typings"
import { UserError } from "../../../../user-error.ts"
import { addTurnText } from "../../../../work/turn/add-turn-text.ts"
import { projectRoot } from "../../../project-root.ts"
import { readTextOrFile } from "../../../read-text-or-file.ts"

export function registerTurnAddTextCommand(turnAddCommand: Command): void {
    turnAddCommand
        .command("text")
        .description(
            "Add a text to your next turn. As a model's, it joins the discussion of your task's ticket once the turn is sent, passing the hand to no one.",
        )
        .addOption(new Option("-t, --text <text>", "the text, in Markdown"))
        .addOption(
            new Option(
                "-F, --text-file <path>",
                "read the text from a file, or from stdin with -",
            ).conflicts("text"),
        )
        .action(async (options) => {
            const text = await readTextOrFile(options.text, options.textFile)
            if (text === undefined) {
                throw new UserError(
                    "Give the text with -t, --text or -F, --text-file.",
                )
            }
            await addTurnText(projectRoot, process.env, text)
            console.error(
                "Added a text to your turn. Send it with `aico turn send`.",
            )
        })
}
