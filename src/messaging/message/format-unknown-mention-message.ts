export function formatUnknownMentionMessage(mentionId: string): string {
    return `"@${mentionId}" names no position, so it mentions nobody.`
}
