import { emitKeypressEvents } from "node:readline"

type Keypress = { ctrl?: boolean; name?: string }

export type SessionStop = {
    signal: AbortSignal
    stopped: Promise<void>
    isInterrupted(): boolean
    listenWhileWaiting(): void
    dispose(): void
}

export function createSessionStop(input: NodeJS.ReadStream): SessionStop {
    const controller = new AbortController()
    const onKeypress = (_: unknown, key: Keypress | undefined) => {
        if (key?.ctrl === true && (key.name === "d" || key.name === "c")) {
            controller.abort(key.name === "c" ? "interrupt" : "stop")
        }
    }
    const onEnd = () => controller.abort("stop")
    emitKeypressEvents(input)
    input.on("keypress", onKeypress)
    input.on("end", onEnd)
    const stopped = new Promise<void>((resolve) => {
        controller.signal.addEventListener("abort", () => resolve(), {
            once: true,
        })
    })
    return {
        signal: controller.signal,
        stopped,
        isInterrupted: () => controller.signal.reason === "interrupt",
        // Between questions, Inquirer leaves the terminal in line mode,
        // where Ctrl+D only ends a line that was typed first.
        listenWhileWaiting: () => {
            if (input.isTTY) {
                input.setRawMode(true)
            }
            input.resume()
        },
        dispose: () => {
            input.off("keypress", onKeypress)
            input.off("end", onEnd)
            if (input.isTTY) {
                input.setRawMode(false)
            }
            input.pause()
        },
    }
}
