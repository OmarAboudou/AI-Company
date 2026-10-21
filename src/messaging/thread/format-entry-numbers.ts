export function formatEntryNumbers(
    firstNumber: number,
    lastNumber: number,
): string {
    return firstNumber === lastNumber
        ? `Entry #${firstNumber}`
        : `Entries #${firstNumber} to #${lastNumber}`
}
