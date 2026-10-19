export function printUnknownMentions(unknownMentionIds: string[]): void {
    for (const positionId of unknownMentionIds) {
        console.error(
            `"@${positionId}" names no position, so it mentions nobody.`,
        )
    }
}
