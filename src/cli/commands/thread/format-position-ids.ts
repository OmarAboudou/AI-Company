export function formatPositionIds(positionIds: string[]): string {
    return positionIds.map((id) => `@${id}`).join(", ")
}
