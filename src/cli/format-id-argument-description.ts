import { entityFolders } from "./entity-folders.ts"

export function idDescription(
    entity: keyof typeof entityFolders,
    example: string,
): string {
    return `${entity} id, which is also the name of its folder in ${entityFolders[entity]} (kebab-case, e.g. ${example})`
}
