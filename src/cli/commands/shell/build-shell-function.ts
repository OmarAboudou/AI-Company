// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { rcFileNames, type Shell } from "./shells.ts"

export function buildShellFunction(shell: Shell): string {
    return [
        `# llmco's shell function, which switch-to-human and switch-to-director need: add eval "$(llmco shell init ${shell})" to ~/${rcFileNames[shell]}`,
        "llmco() {",
        '    case "${1-}" in',
        "    switch-to-human|switch-to-director)",
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
