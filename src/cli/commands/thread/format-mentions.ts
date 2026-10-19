export function formatMentions(positionIds: string[]): string {
    return positionIds.map((id) => `@${id}`).join(", ")
}
