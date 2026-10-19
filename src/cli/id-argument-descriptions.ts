const entityFolderPaths = {
    thread: ".llmco/threads",
    position: ".llmco/positions",
    employee: ".llmco/employees",
    provider: ".llmco/llm-providers",
    model: ".llmco/llm-providers/<provider-id>/models",
}

export function formatIdArgumentDescription(
    entityKind: keyof typeof entityFolderPaths,
    example: string,
): string {
    return `${entityKind} id, which is also the name of its folder in ${entityFolderPaths[entityKind]} (kebab-case, e.g. ${example})`
}

export function formatNewIdArgumentDescription(
    entityKind: keyof typeof entityFolderPaths,
    example: string,
): string {
    return `new ${entityKind} id, which becomes the name of its folder in ${entityFolderPaths[entityKind]} (kebab-case, e.g. ${example})`
}
