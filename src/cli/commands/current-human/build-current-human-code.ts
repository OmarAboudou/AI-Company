import type { CurrentHuman } from "../../../organization/human/read-current-human.ts"

export function buildCurrentHumanCode(currentHuman: CurrentHuman): string {
    return currentHuman.kind === "director"
        ? "unset LLMCO_CURRENT_HUMAN_ID LLMCO_CURRENT_POSITION_ID\n"
        : `export LLMCO_CURRENT_HUMAN_ID="${currentHuman.employee.id}"\nunset LLMCO_CURRENT_POSITION_ID\n`
}
