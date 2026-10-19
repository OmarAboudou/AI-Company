import { describe, expect, test } from "bun:test"
import { getPositionsFilledBy } from "./get-positions-filled-by.ts"

const developer = {
    id: "developer",
    title: "Developer",
    description: "",
    defaultEmployeeId: "omar",
}
const tester = { id: "qa-tester", title: "QA", description: "" }

describe("getPositionsFilledBy", () => {
    test("keeps the positions whose default employee it is", () => {
        const positions = [developer, tester]

        expect(getPositionsFilledBy(positions, "omar")).toEqual([developer])
        expect(getPositionsFilledBy(positions, "julie")).toEqual([])
    })
})
