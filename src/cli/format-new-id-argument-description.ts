import { entityFolders } from "./entity-folders.ts"

export function newIdDescription(
    entity: keyof typeof entityFolders,
    example: string,
): string {
    return `new ${entity} id, which becomes the name of its folder in ${entityFolders[entity]} (kebab-case, e.g. ${example})`
}
