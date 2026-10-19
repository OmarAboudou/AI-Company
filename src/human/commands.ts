import type { Command } from "@commander-js/extra-typings"
import { projectRoot } from "../cli/project-root.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadCompany } from "../company/storage.ts"
import { readGitCommitter } from "../git/read-git-committer.ts"
import { listPositionsWorkedBy } from "../organization/human/list-positions-worked-by.ts"
import { readCurrentHuman } from "../organization/human/read-current-human.ts"
import { listPositions } from "../organization/position/storage.ts"

export function registerHumanCommands(program: Command): void {
    program
        .command("whoami")
        .description(
            "Show who is at the keyboard: a director, or the human employee LLMCO_CURRENT_HUMAN_ID names; the positions they work; and the committer, from git.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const [human, positions, company] = await Promise.all([
                readCurrentHuman(projectRoot),
                listPositions(projectRoot),
                loadCompany(projectRoot),
            ])
            const worked = await listPositionsWorkedBy(
                projectRoot,
                human,
                positions,
                company.directorPositionId,
            )
            const { name, email } = readGitCommitter(projectRoot)
            const who =
                human.kind === "director"
                    ? `${name}, a director`
                    : `${human.employee.name} (${human.employee.id}), a human employee`
            const workedIds = worked.map(({ position, isTemporary }) =>
                isTemporary ? `${position.id} (temporarily)` : position.id,
            )
            console.log(
                [
                    who,
                    `positions: ${workedIds.length > 0 ? workedIds.join(", ") : "(none)"}`,
                    `committer: ${name} <${email}>`,
                ].join("\n"),
            )
        })
}
