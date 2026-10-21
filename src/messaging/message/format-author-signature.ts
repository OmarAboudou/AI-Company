import { formatPositionLabel } from "./format-position-label.ts"
import { getAuthorName } from "./get-author-name.ts"
import type { Author } from "./schema.ts"

export function formatAuthorSignature(author: Author): string {
    return `${getAuthorName(author)}, ${formatPositionLabel(author.position)}`
}
