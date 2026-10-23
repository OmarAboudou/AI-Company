export function buildCurrentPositionCode(
    positionId: string | undefined,
): string {
    return positionId === undefined
        ? "unset AICO_CURRENT_POSITION_ID\n"
        : `export AICO_CURRENT_POSITION_ID="${positionId}"\n`
}
