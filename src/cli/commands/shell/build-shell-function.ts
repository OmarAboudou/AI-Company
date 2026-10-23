// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { shellCodeCommands } from "./shell-code-commands.ts"
import { rcFileNames, type Shell } from "./shells.ts"

const promptRegistrations: Record<Shell, string[]> = {
    bash: [
        'case "${PROMPT_COMMAND-}" in',
        "*_aico_update_prompt*) ;;",
        '*) PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }_aico_update_prompt" ;;',
        "esac",
    ],
    zsh: [
        "precmd_functions=(${precmd_functions:#_aico_update_prompt} _aico_update_prompt)",
    ],
}

export function buildShellFunction(shell: Shell): string {
    return [
        `# AICo's shell function, which current-position set and clear need, and the prompt's label: add eval "$(aico shell init ${shell})" to ~/${rcFileNames[shell]}`,
        "aico() {",
        '    case "${1-} ${2-}" in',
        `    ${shellCodeCommands.map((command) => `"${command}"`).join(" | ")})`,
        "        local shell_code",
        '        shell_code="$(command aico "$@" --shell-code)" || return',
        '        eval "$shell_code"',
        "        ;;",
        "    *)",
        '        command aico "$@"',
        "        ;;",
        "    esac",
        "}",
        "_aico_prompt_label() {",
        "    [ -d .aico ] || return 0",
        '    local label="aico"',
        '    if [ -n "${AICO_CURRENT_POSITION_ID-}" ]; then',
        '        label="$label @$AICO_CURRENT_POSITION_ID"',
        "    fi",
        "    printf '(%s) ' \"$label\"",
        "}",
        "_aico_update_prompt() {",
        '    local label=""',
        '    [ -n "${AICO_DISABLE_PROMPT-}" ] || label="$(_aico_prompt_label)"',
        '    PS1="$label${PS1#"${_aico_shown_label-}"}"',
        '    _aico_shown_label="$label"',
        "}",
        ...promptRegistrations[shell],
        "",
    ].join("\n")
}
