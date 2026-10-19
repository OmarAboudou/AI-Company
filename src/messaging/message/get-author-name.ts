import type { Author } from "./schema.ts"

export function authorName({ employee, committer }: Author): string {
    return employee?.name ?? committer.name
}
