let lastTime = Number.NEGATIVE_INFINITY

// Records created by one process within a millisecond, such as the tasks of
// a message mentioning several positions, still sort in the order they were
// created. Two processes are always more than a millisecond apart.
export function readMonotonicTime(): string {
    lastTime = Math.max(Date.now(), lastTime + 1)
    return new Date(lastTime).toISOString()
}
