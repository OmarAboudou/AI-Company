import type { Subprocess } from "bun"

export type InteractiveCli = {
    write(keys: string): void
    waitForOutput(text: string): Promise<void>
    exited(): Promise<{ exitCode: number; stdout: string; stderr: string }>
    process: Subprocess
}

const outputTimeoutMs = 10_000

export function startInteractiveCli(
    command: string[],
    { cwd, env }: { cwd: string; env: Record<string, string | undefined> },
): InteractiveCli {
    const cliProcess = Bun.spawn(command, {
        cwd,
        env,
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
    })
    let stdout = ""
    let readOffset = 0
    const decoder = new TextDecoder()
    const stdoutReading = (async () => {
        for await (const chunk of cliProcess.stdout) {
            stdout += decoder.decode(chunk, { stream: true })
        }
    })()
    const stderrReading = new Response(cliProcess.stderr).text()
    return {
        write: (keys) => {
            cliProcess.stdin.write(keys)
            cliProcess.stdin.flush()
        },
        // Each text is looked for after the last one found, so that a
        // question asked again is told from its earlier times.
        waitForOutput: async (text) => {
            const deadline = Date.now() + outputTimeoutMs
            while (true) {
                const index = stdout.indexOf(text, readOffset)
                if (index !== -1) {
                    readOffset = index + text.length
                    return
                }
                if (Date.now() > deadline) {
                    throw new Error(
                        `The CLI never printed ${JSON.stringify(text)}, but:\n${stdout.slice(readOffset)}`,
                    )
                }
                await Bun.sleep(10)
            }
        },
        exited: async () => {
            const [exitCode, , stderr] = await Promise.all([
                cliProcess.exited,
                stdoutReading,
                stderrReading,
            ])
            return { exitCode, stdout, stderr }
        },
        process: cliProcess,
    }
}
