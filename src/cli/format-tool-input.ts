export function formatToolInput(input: unknown): string[] {
    if (typeof input !== "object" || input === null) {
        return [`  ${JSON.stringify(input)}`]
    }
    return Object.entries(input).flatMap(([name, value]) =>
        typeof value === "string" && value.includes("\n")
            ? [`  ${name}:`, ...value.split("\n").map((line) => `    ${line}`)]
            : [`  ${name}: ${JSON.stringify(value)}`],
    )
}
