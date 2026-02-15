import { createDefine } from 'fresh'
import type { TranslationState } from 'fresh-i18n'
import type { FormattedRepo } from '~/lib/github.ts'

export interface State extends Record<string, unknown> {
	title?: string
	repos?: FormattedRepo[]
	cspNonce?: string
	assetOrigin?: string
	requestPath?: string
}

export type ExtendedState = State & TranslationState

export const define = createDefine<ExtendedState>()
