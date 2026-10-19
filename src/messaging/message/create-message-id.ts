import { randomBytes } from "node:crypto"

export function newMessageId(sentAt: string): string {
    const digits = sentAt.replace(/\D/g, "")
    const [date, time, milliseconds] = [
        digits.slice(0, 8),
        digits.slice(8, 14),
        digits.slice(14, 17).padEnd(3, "0"),
    ]
    return `${date}-${time}-${milliseconds}-${randomBytes(2).toString("hex")}`
}
