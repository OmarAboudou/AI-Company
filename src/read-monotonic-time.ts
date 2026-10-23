let lastTime = Number.NEGATIVE_INFINITY

// Records created by one process within a millisecond, such as a session's
// start and the first message it writes, still sort in the order they were
// created. Two processes are always more than a millisecond apart.
export function readMonotonicTime(): string {
    lastTime = Math.max(Date.now(), lastTime + 1)
    return new Date(lastTime).toISOString()
}
