import { hadIdAt } from "./had-id-at.ts"
import type { IdHistory } from "./id-history-schema.ts"

export function isAuthorOf(
    employee: IdHistory,
    { employee: author, sentAt }: { employee?: { id: string }; sentAt: string },
): boolean {
    return author !== undefined && hadIdAt(employee, author.id, sentAt)
}
