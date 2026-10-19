export function mentionsOf(positionIds: string[]): string {
    return positionIds.map((id) => `@${id}`).join(", ")
}
