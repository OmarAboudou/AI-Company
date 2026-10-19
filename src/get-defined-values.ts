export function getDefinedValues<Values extends object>(
    values: Values,
): Partial<Values> {
    return Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined),
    ) as Partial<Values>
}
