import type { Author } from "./schema.ts"

export function getAuthorName({ employee, committer }: Author): string {
    return employee?.name ?? committer.name
}
