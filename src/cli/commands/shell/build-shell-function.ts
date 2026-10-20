// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { rcFileNames, type Shell } from "./shells.ts"

export function buildShellFunction(shell: Shell): string {
    return [
        `# llmco's shell function, which current-human and current-position set and clear need: add eval "$(llmco shell init ${shell})" to ~/${rcFileNames[shell]}`,
        "llmco() {",
        '    case "${1-} ${2-}" in',
        '    "current-human set" | "current-human clear" | "whoami set" | "whoami clear" | "current-position set" | "current-position clear")',
        "        local shell_code",
        '        shell_code="$(command llmco "$@" --shell-code)" || return',
        '        eval "$shell_code"',
        "        ;;",
        "    *)",
        '        command llmco "$@"',
        "        ;;",
        "    esac",
        "}",
        "",
    ].join("\n")
}
