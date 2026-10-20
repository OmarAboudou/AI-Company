import { UserError } from "../../../user-error.ts"

export function requireShellFunction(
    shouldPrintShellCode: boolean | undefined,
): void {
    if (!shouldPrintShellCode) {
        throw new UserError(
            "current-human set and clear change your shell's environment, which only llmco's shell function can do. Set it up once with `llmco shell init bash --install` (or zsh), then open a new terminal. A script sets LLMCO_CURRENT_HUMAN_ID itself.",
        )
    }
}
