import type { Shell } from "./shells.ts"

const startupFreeCommands: Record<Shell, string[]> = {
    bash: ["bash", "--norc", "--noprofile"],
    zsh: ["zsh", "-f"],
}

export type ShellRun = { stdout: string; stderr: string }

export function isShellInstalled(shell: Shell): boolean {
    return Bun.which(shell) !== null
}

export function runShell(
    shell: Shell,
    script: string,
    {
        args = [],
        cwd,
        env,
    }: { args?: string[]; cwd?: string; env: Record<string, string> },
): ShellRun {
    const shellProcess = Bun.spawnSync(
        [...startupFreeCommands[shell], "-c", script, shell, ...args],
        { cwd, env },
    )
    return {
        stdout: shellProcess.stdout.toString(),
        stderr: shellProcess.stderr.toString(),
    }
}
