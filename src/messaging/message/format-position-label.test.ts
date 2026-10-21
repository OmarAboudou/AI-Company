import { describe, expect, test } from "bun:test"
import { formatPositionLabel } from "./format-position-label.ts"

describe("formatPositionLabel", () => {
    test("gives the title, then the id to mention the position with", () => {
        const position = { id: "backend-developer", title: "Backend Developer" }

        const positionLabel = formatPositionLabel(position)

        expect(positionLabel).toBe("Backend Developer (@backend-developer)")
    })
})
