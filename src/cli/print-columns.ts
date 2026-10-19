export function printColumns(rows: string[][]): void {
    const columnWidths: number[] = []
    for (const row of rows) {
        row.forEach((cell, columnIndex) => {
            columnWidths[columnIndex] = Math.max(
                columnWidths[columnIndex] ?? 0,
                cell.length,
            )
        })
    }
    for (const row of rows) {
        const cells = row.map((cell, columnIndex) =>
            columnIndex < row.length - 1
                ? cell.padEnd(columnWidths[columnIndex] ?? 0)
                : cell,
        )
        console.log(cells.join("  ").trimEnd())
    }
}
