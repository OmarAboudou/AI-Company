export function formatPositionLabel({
    id,
    title,
}: {
    id: string
    title: string
}): string {
    return `${title} (@${id})`
}
