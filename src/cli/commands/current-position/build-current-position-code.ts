export function buildCurrentPositionCode(
    positionId: string | undefined,
): string {
    return positionId === undefined
        ? "unset LLMCO_CURRENT_POSITION_ID\n"
        : `export LLMCO_CURRENT_POSITION_ID="${positionId}"\n`
}
