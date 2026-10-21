export function getWithSortedKeys<Value>(value: Value): Value {
    if (Array.isArray(value)) {
        return value.map(getWithSortedKeys) as Value
    }
    if (typeof value !== "object" || value === null) {
        return value
    }
    return Object.fromEntries(
        Object.entries(value)
            .sort(([key], [otherKey]) => key.localeCompare(otherKey))
            .map(([key, fieldValue]) => [key, getWithSortedKeys(fieldValue)]),
    ) as Value
}
