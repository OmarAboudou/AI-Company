import type { Message } from "./message.ts"

export function signature({
    position,
    employee,
    committer,
}: Pick<Message, "position" | "employee" | "committer">): string {
    const name = employee?.name ?? committer.name
    return `${name}, ${position.title} (@${position.id})`
}

export function minutes(timestamp: string): string {
    return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 16)} UTC`
}
