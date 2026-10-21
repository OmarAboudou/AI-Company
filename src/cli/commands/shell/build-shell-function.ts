// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { shellCodeCommands } from "./shell-code-commands.ts"
import { rcFileNames, type Shell } from "./shells.ts"

const promptRegistrations: Record<Shell, string[]> = {
    bash: [
        'case "${PROMPT_COMMAND-}" in',
        "*_llmco_update_prompt*) ;;",
        '*) PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }_llmco_update_prompt" ;;',
        "esac",
    ],
    zsh: [
        "precmd_functions=(${precmd_functions:#_llmco_update_prompt} _llmco_update_prompt)",
    ],
}

export function buildShellFunction(shell: Shell): string {
    return [
        `# llmco's shell function, which current-human and current-position set and clear need, and the prompt's label: add eval "$(llmco shell init ${shell})" to ~/${rcFileNames[shell]}`,
        "llmco() {",
        '    case "${1-} ${2-}" in',
        `    ${shellCodeCommands.map((command) => `"${command}"`).join(" | ")})`,
        "        local shell_code",
        '        shell_code="$(command llmco "$@" --shell-code)" || return',
        '        eval "$shell_code"',
        "        ;;",
        "    *)",
        '        command llmco "$@"',
        "        ;;",
        "    esac",
        "}",
        "_llmco_prompt_label() {",
        "    [ -d .llmco ] || return 0",
        '    local label="${LLMCO_CURRENT_HUMAN_ID:-director}"',
        '    if [ -n "${LLMCO_CURRENT_POSITION_ID-}" ]; then',
        '        label="$label @$LLMCO_CURRENT_POSITION_ID"',
        "    fi",
        "    printf '(%s) ' \"$label\"",
        "}",
        "_llmco_update_prompt() {",
        '    local label=""',
        '    [ -n "${LLMCO_DISABLE_PROMPT-}" ] || label="$(_llmco_prompt_label)"',
        '    PS1="$label${PS1#"${_llmco_shown_label-}"}"',
        '    _llmco_shown_label="$label"',
        "}",
        ...promptRegistrations[shell],
        "",
    ].join("\n")
}
