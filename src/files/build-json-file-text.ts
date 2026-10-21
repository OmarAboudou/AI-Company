export function buildJsonFileText(content: object): string {
    return `${JSON.stringify(content, null, 4)}\n`
}
