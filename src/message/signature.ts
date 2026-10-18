import type { Author } from "./author.ts"

export function authorName({ employee, committer }: Author): string {
    return employee?.name ?? committer.name
}

export function signature(author: Author): string {
    const { position } = author
    return `${authorName(author)}, ${position.title} (@${position.id})`
}

export function minutes(timestamp: string): string {
    return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 16)} UTC`
}
