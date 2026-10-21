import type { Command } from "@commander-js/extra-typings"
import { readGitCommitter } from "../../../git/read-git-committer.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { getPositionsWorkedBy } from "../../../organization/human/get-positions-worked-by.ts"
import { readCurrentHuman } from "../../../organization/human/read-current-human.ts"
import { readCurrentPositionId } from "../../../organization/human/read-current-position-id.ts"
import { listPositionAssignments } from "../../../organization/position/list-position-assignments.ts"
import { projectRoot } from "../../project-root.ts"

export function registerCurrentHumanShowCommand(
    currentHumanCommand: Command,
): void {
    currentHumanCommand
        .command("show", { isDefault: true })
        .description(
            "Show who is at the keyboard: a director, or the human employee current-human set chose; the positions they work; and the committer, from git.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const [human, assignments] = await Promise.all([
                readCurrentHuman(projectRoot),
                listPositionAssignments(projectRoot),
            ])
            const workedAssignments = getPositionsWorkedBy(assignments, human)
            const committer = readGitCommitter(projectRoot)
            const identityMessage =
                human.kind === "director"
                    ? `${committer.name}, a director`
                    : `${human.employee.name} (${human.employee.id}), a human employee`
            const currentPositionId = readCurrentPositionId()
            const workedPositionLabels = workedAssignments.map(
                ({ position, state }) => {
                    const notes = [
                        ...(state.temporaryAssignment === undefined
                            ? []
                            : ["temporarily"]),
                        ...(position.id === currentPositionId
                            ? ["selected"]
                            : []),
                    ]
                    return notes.length === 0
                        ? position.id
                        : `${position.id} (${notes.join(", ")})`
                },
            )
            console.log(
                [
                    identityMessage,
                    `positions: ${workedPositionLabels.length > 0 ? workedPositionLabels.join(", ") : "(none)"}`,
                    `committer: ${committer.name} <${committer.email}>`,
                ].join("\n"),
            )
        })
}
