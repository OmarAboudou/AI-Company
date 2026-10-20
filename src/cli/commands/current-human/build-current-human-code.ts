// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import type { CurrentHuman } from "../../../organization/human/read-current-human.ts"

export function buildCurrentHumanCode(currentHuman: CurrentHuman): string {
    if (currentHuman.kind === "director") {
        return [
            "unset LLMCO_CURRENT_HUMAN_ID LLMCO_CURRENT_POSITION_ID",
            'if [ -n "${_LLMCO_OLD_PS1+set}" ]; then',
            '    PS1="$_LLMCO_OLD_PS1"',
            "    unset _LLMCO_OLD_PS1",
            "fi",
            "",
        ].join("\n")
    }
    const { id } = currentHuman.employee
    return [
        `export LLMCO_CURRENT_HUMAN_ID="${id}"`,
        "unset LLMCO_CURRENT_POSITION_ID",
        'if [ -z "${LLMCO_DISABLE_PROMPT-}" ]; then',
        '    if [ -z "${_LLMCO_OLD_PS1+set}" ]; then _LLMCO_OLD_PS1="${PS1-}"; fi',
        `    PS1="(${id}) $_LLMCO_OLD_PS1"`,
        "fi",
        "",
    ].join("\n")
}
