const entityFolders = {
    thread: ".llmco/threads",
    position: ".llmco/positions",
    employee: ".llmco/employees",
    provider: ".llmco/llm-providers",
    model: ".llmco/llm-providers/<provider-id>/models",
}

export function formatIdArgumentDescription(
    entity: keyof typeof entityFolders,
    example: string,
): string {
    return `${entity} id, which is also the name of its folder in ${entityFolders[entity]} (kebab-case, e.g. ${example})`
}

export function formatNewIdArgumentDescription(
    entity: keyof typeof entityFolders,
    example: string,
): string {
    return `new ${entity} id, which becomes the name of its folder in ${entityFolders[entity]} (kebab-case, e.g. ${example})`
}
