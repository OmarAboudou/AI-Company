import { emitKeypressEvents } from "node:readline"

type Keypress = { ctrl?: boolean; name?: string }

export type SessionStop = {
    signal: AbortSignal
    stopped: Promise<void>
    listenWhileWaiting(): void
    dispose(): void
}

function isStopKey(key: Keypress | undefined): boolean {
    return key?.ctrl === true && (key.name === "c" || key.name === "d")
}

export function createSessionStop(input: NodeJS.ReadStream): SessionStop {
    const controller = new AbortController()
    const onKeypress = (_: unknown, key: Keypress | undefined) => {
        if (isStopKey(key)) {
            controller.abort()
        }
    }
    const onEnd = () => controller.abort()
    // While AICo works between two questions, the terminal turns Ctrl+C
    // into SIGINT: the session ends once that work is done, and a second
    // Ctrl+C ends it at once, should that work hang.
    const onInterrupt = () => {
        if (controller.signal.aborted) {
            process.exit(130)
        }
        controller.abort()
    }
    emitKeypressEvents(input)
    input.on("keypress", onKeypress)
    input.on("end", onEnd)
    process.on("SIGINT", onInterrupt)
    const stopped = new Promise<void>((resolve) => {
        controller.signal.addEventListener("abort", () => resolve(), {
            once: true,
        })
    })
    return {
        signal: controller.signal,
        stopped,
        // Between questions, Inquirer leaves the terminal in line mode,
        // where Ctrl+D only ends an empty line and the keys pressed show.
        listenWhileWaiting: () => {
            if (input.isTTY) {
                input.setRawMode(true)
            }
            input.resume()
        },
        dispose: () => {
            input.off("keypress", onKeypress)
            input.off("end", onEnd)
            process.off("SIGINT", onInterrupt)
            if (input.isTTY) {
                input.setRawMode(false)
            }
            input.pause()
        },
    }
}
