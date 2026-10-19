#!/usr/bin/env bun
import { UserError } from "./errors.ts"
import { createProgram } from "./program.ts"

try {
    await createProgram().parseAsync()
} catch (error) {
    if (!(error instanceof UserError)) {
        throw error
    }
    console.error(error.message)
    process.exitCode = 1
}
