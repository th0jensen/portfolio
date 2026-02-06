import { z } from 'zod'

export const SUPPORTED_LOCALES = ['en', 'no', 'he'] as const
export const DEFAULT_LOCALE = 'en' as const

export const LocaleCodeSchema = z.enum(SUPPORTED_LOCALES)

export type LocaleCode = z.infer<typeof LocaleCodeSchema>
