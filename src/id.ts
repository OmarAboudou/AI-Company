import { z } from "zod"

export const IdSchema = z
    .string()
    .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "must be kebab-case: lowercase letters and digits separated by single hyphens",
    )
