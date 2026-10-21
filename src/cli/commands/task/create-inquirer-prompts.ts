import { confirm, editor, input, number } from "@inquirer/prompts"
import type { ToolInputPrompts } from "./ask-tool-input.ts"

export type PromptContext = NonNullable<Parameters<typeof input>[1]>

export function createInquirerPrompts(
    context: PromptContext,
): ToolInputPrompts {
    return {
        askLine: ({ message, isRequired }) =>
            input({ message, required: isRequired }, context),
        askText: async ({ message, isRequired }) => {
            const text = await editor(
                {
                    message,
                    postfix: ".md",
                    validate: (value) =>
                        !isRequired ||
                        value.trim() !== "" ||
                        "The text is empty: write it, then close the editor.",
                },
                context,
            )
            return text.trimEnd()
        },
        askNumber: ({ message, isRequired, isInteger, min }) =>
            number(
                {
                    message,
                    required: isRequired,
                    step: isInteger ? 1 : "any",
                    ...(min !== undefined && { min }),
                },
                context,
            ),
        askYesNo: ({ message }) => confirm({ message }, context),
    }
}
