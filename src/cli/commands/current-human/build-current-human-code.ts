import type { CurrentHuman } from "../../../organization/human/read-current-human.ts"

export function buildCurrentHumanCode(currentHuman: CurrentHuman): string {
    return currentHuman.kind === "director"
        ? "unset AICO_CURRENT_HUMAN_ID AICO_CURRENT_POSITION_ID\n"
        : `export AICO_CURRENT_HUMAN_ID="${currentHuman.employee.id}"\nunset AICO_CURRENT_POSITION_ID\n`
}
