import { hadId } from "./had-id-at.ts"
import type { IdHistory } from "./id-history-schema.ts"

export function wrote(
    employee: IdHistory,
    { employee: author, sentAt }: { employee?: { id: string }; sentAt: string },
): boolean {
    return author !== undefined && hadId(employee, author.id, sentAt)
}
