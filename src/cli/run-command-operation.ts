import type { CommandUnknownOpts } from "@commander-js/extra-typings"
import { runOperation } from "../git/reserved-branch/run-operation.ts"
import { requireCompany } from "../organization/company/require-company.ts"
import { formatOperationName } from "./format-operation-name.ts"
import { projectRoot } from "./project-root.ts"

export async function runCommandOperation<Result>(
    command: CommandUnknownOpts,
    operate: () => Promise<Result>,
): Promise<Result> {
    await requireCompany(projectRoot)
    return runOperation(projectRoot, formatOperationName(command), operate)
}
