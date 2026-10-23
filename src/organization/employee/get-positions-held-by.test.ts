import { describe, expect, test } from "bun:test"
import { getPositionsHeldBy } from "./get-positions-held-by.ts"

const developer = {
    id: "developer",
    title: "Developer",
    description: "",
    employeeId: "omar",
}
const tester = { id: "qa-tester", title: "QA", description: "" }

describe("getPositionsHeldBy", () => {
    test("keeps the positions the employee holds", () => {
        const positions = [developer, tester]

        expect(getPositionsHeldBy(positions, "omar")).toEqual([developer])
        expect(getPositionsHeldBy(positions, "julie")).toEqual([])
    })
})
