import { projectRoot } from "../cli-helpers.ts"
import { loadCompany } from "../company/storage.ts"
import type { Employee } from "../employee/employee.ts"
import { UserError } from "../errors.ts"
import { gitConfig } from "../git.ts"
import { currentHuman, positionsWorkedBy } from "../human/current-human.ts"
import type { Position } from "../position/position.ts"
import { listPositions, loadPosition } from "../position/storage.ts"
import type { Archive } from "../thread/archives.ts"
import { memberIds } from "../thread/members.ts"
import type { MessageConfig } from "./message.ts"

export type Author = Pick<MessageConfig, "position" | "employee" | "committer">

export function committer(): MessageConfig["committer"] {
    const name = gitConfig(projectRoot, "user.name")
    const email = gitConfig(projectRoot, "user.email")
    if (name === undefined || email === undefined) {
        throw new UserError(
            "Messages record who typed them, as commits do: set `git config user.name` and `git config user.email`.",
        )
    }
    return { name, email }
}

function only<Item>(items: Item[]): Item | undefined {
    return items.length === 1 ? items[0] : undefined
}

function onlyPositionOf(employee: Employee, worked: Position[]): Position {
    const position = only(worked)
    if (position !== undefined) {
        return position
    }
    const who = `${employee.name} (${employee.id})`
    if (worked.length === 0) {
        throw new UserError(
            `${who} works no position to write from. A director can assign one temporarily: \`llmco position assign-temporarily employee <position-id> ${employee.id}\`.`,
        )
    }
    throw new UserError(
        `${who} works several positions, ${worked.map(({ id }) => id).join(", ")}: llmco can't tell which one to write from.`,
    )
}

export async function currentAuthor(archive?: Archive): Promise<Author> {
    const [human, positions, { directorPositionId }] = await Promise.all([
        currentHuman(),
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    const worked = await positionsWorkedBy(human, positions, directorPositionId)
    const workedPositions = worked.map(({ position }) => position)
    const members =
        archive === undefined
            ? []
            : memberIds(archive.thread, archive.messages, positions)
    const position =
        only(workedPositions.filter(({ id }) => members.includes(id))) ??
        (human.kind === "director"
            ? await loadPosition(projectRoot, directorPositionId)
            : onlyPositionOf(human.employee, workedPositions))
    return {
        position: { id: position.id, title: position.title },
        ...(human.kind === "employee" && {
            employee: { id: human.employee.id, name: human.employee.name },
        }),
        committer: committer(),
    }
}
