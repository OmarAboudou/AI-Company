export function printColumns(rows: string[][]): void {
    const columnWidths: number[] = []
    for (const row of rows) {
        row.forEach((cell, column) => {
            columnWidths[column] = Math.max(
                columnWidths[column] ?? 0,
                cell.length,
            )
        })
    }
    for (const row of rows) {
        const cells = row.map((cell, column) =>
            column < row.length - 1
                ? cell.padEnd(columnWidths[column] ?? 0)
                : cell,
        )
        console.log(cells.join("  ").trimEnd())
    }
}
