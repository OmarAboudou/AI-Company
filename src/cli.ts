#!/usr/bin/env bun
import { createProgram } from "./program.ts"
import { UserError } from "./user-error.ts"

try {
    await createProgram().parseAsync()
} catch (error) {
    if (!(error instanceof UserError)) {
        throw error
    }
    console.error(error.message)
    process.exitCode = 1
}
