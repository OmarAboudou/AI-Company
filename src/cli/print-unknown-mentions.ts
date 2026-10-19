export function printUnknownMentions(unknownMentionIds: string[]): void {
    for (const mentionId of unknownMentionIds) {
        console.error(
            `"@${mentionId}" names no position, so it mentions nobody.`,
        )
    }
}
