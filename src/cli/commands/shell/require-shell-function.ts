import { UserError } from "../../../user-error.ts"

export function requireShellFunction(
    shouldPrintShellCode: boolean | undefined,
): void {
    if (!shouldPrintShellCode) {
        throw new UserError(
            "current-human and current-position set and clear change your shell's environment, which only llmco's shell function can do. Set it up once with `aico shell init bash --install` (or zsh), then open a new terminal. A script sets LLMCO_CURRENT_HUMAN_ID and LLMCO_CURRENT_POSITION_ID itself.",
        )
    }
}
