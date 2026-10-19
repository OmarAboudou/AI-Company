export function formatDateTime(timestamp: string): string {
    return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 16)} UTC`
}
