import { z } from "zod"

const kebabCase =
    "must be kebab-case: lowercase letters and digits separated by single hyphens"

export const IdSchema = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, kebabCase)
    .meta({ patternErrorMessage: kebabCase })
