export const shells = ["bash", "zsh"] as const

export type Shell = (typeof shells)[number]

export const rcFileNames: Record<Shell, string> = {
    bash: ".bashrc",
    zsh: ".zshrc",
}
