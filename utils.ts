import { createDefine } from 'fresh'
import type { TranslationState } from 'fresh-i18n'
import type { FormattedRepo } from '~/lib/github.ts'

export interface State {
	title?: string
	repos?: FormattedRepo[]
}

export type ExtendedState = State & TranslationState

export const define = createDefine<ExtendedState>()
