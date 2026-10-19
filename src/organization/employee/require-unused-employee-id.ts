import { isAuthorOf } from "../../ids/is-author-of.ts"
import { listArchives } from "../../messaging/thread/list-archives.ts"
import { UserError } from "../../user-error.ts"
import type { Employee } from "./schema.ts"
import { listEmployees } from "./storage.ts"

async function listEarlierUses(
    projectRoot: string,
    id: string,
    renamedEmployee: Employee | undefined,
): Promise<string[]> {
    const [employees, archives] = await Promise.all([
        listEmployees(projectRoot),
        listArchives(projectRoot),
    ])
    const formerIdUses = employees
        .filter(
            (employee) =>
                employee.id !== renamedEmployee?.id &&
                employee.formerIds?.some(({ id: formerId }) => formerId === id),
        )
        .map((employee) => `as a former id of employee "${employee.id}"`)
    const threadUses = archives
        .filter(({ thread, messages }) => {
            const threadCreator = {
                employee: thread.createdBy.employee,
                sentAt: thread.createdAt,
            }
            return [threadCreator, ...messages].some(
                (authorship) =>
                    authorship.employee?.id === id &&
                    !(
                        renamedEmployee !== undefined &&
                        isAuthorOf(renamedEmployee, authorship)
                    ),
            )
        })
        .map(({ thread }) => `in thread "${thread.id}"`)
    return [...formerIdUses, ...threadUses]
}

export async function requireUnusedEmployeeId(
    projectRoot: string,
    id: string,
    {
        shouldReuseId = false,
        renamedEmployee,
    }: { shouldReuseId?: boolean; renamedEmployee?: Employee } = {},
): Promise<void> {
    if (shouldReuseId) {
        return
    }
    const earlierUses = await listEarlierUses(projectRoot, id, renamedEmployee)
    if (earlierUses.length > 0) {
        throw new UserError(
            `Employee id "${id}" was used before: ${earlierUses.join(", ")}. An employee is a person, and the archives would name two people the same way: add --reuse-id to reuse it anyway.`,
        )
    }
}
