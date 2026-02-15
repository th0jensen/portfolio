import type * as BinInspectTypes from 'https://raw.githubusercontent.com/th0jensen/bininspect/main/lib/bininspect_wasm.d.ts'
export type {
	AnalysisReport,
	CodeSignInfo,
	Severity,
} from 'https://raw.githubusercontent.com/th0jensen/bininspect/main/lib/bininspect_wasm.d.ts'

export const BININSPECT_ENDPOINTS = {
	wasm: '/api/bininspect/wasm',
	internal: '/api/bininspect/internal',
	types: '/api/bininspect/types',
	binary: '/api/bininspect/binary',
} as const

export type BininspectAssetName = keyof typeof BININSPECT_ENDPOINTS

interface BininspectAssetOptions {
	version?: string
}

function resolveServerBaseUrl(): string {
	const domain = Deno.env.get('DOMAIN')?.trim()
	if (!domain) {
		return 'http://127.0.0.1:8000'
	}

	if (domain.startsWith('http://') || domain.startsWith('https://')) {
		return domain.replace(/\/+$/, '')
	}

	return `https://${domain.replace(/\/+$/, '')}`
}

function endpointUrl(
	name: BininspectAssetName,
	options: BininspectAssetOptions = {},
): string {
	const path = BININSPECT_ENDPOINTS[name]
	if (typeof window !== 'undefined') {
		const clientUrl = new URL(path, window.location.origin)
		if (options.version?.trim()) {
			clientUrl.searchParams.set('version', options.version.trim())
		}
		return `${clientUrl.pathname}${clientUrl.search}`
	}

	const serverUrl = new URL(path, resolveServerBaseUrl())
	if (options.version?.trim()) {
		serverUrl.searchParams.set('version', options.version.trim())
	}
	return serverUrl.toString()
}

export async function fetchBininspectAsset(
	name: 'internal' | 'types',
	options?: BininspectAssetOptions,
): Promise<string>
export async function fetchBininspectAsset(
	name: 'wasm' | 'binary',
	options?: BininspectAssetOptions,
): Promise<Uint8Array>
export async function fetchBininspectAsset(
	name: BininspectAssetName,
	options: BininspectAssetOptions = {},
): Promise<string | Uint8Array> {
	const response = await fetch(endpointUrl(name, options))
	if (!response.ok) {
		throw new Error(
			`Failed to load BinInspect ${name} (${response.status}).`,
		)
	}

	if (name === 'internal' || name === 'types') {
		return await response.text()
	}

	return new Uint8Array(await response.arrayBuffer())
}

function toBase64(value: string): string {
	const bytes = new TextEncoder().encode(value)
	let binary = ''
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	return btoa(binary)
}

async function loadInternalModule() {
	const source = await fetchBininspectAsset('internal')
	const dataUrl = `data:text/javascript;base64,${toBase64(source)}`
	return await import(/* @vite-ignore */ dataUrl) as Record<string, unknown>
}

async function loadBinInspectWasm(
	internalPromise: Promise<Record<string, unknown>>,
): Promise<WebAssembly.Instance> {
	const internal = await internalPromise
	const wasmBytes = await fetchBininspectAsset('wasm')

	const imports: WebAssembly.Imports = {
		'./bininspect_wasm.internal.js': internal as WebAssembly.ModuleImports,
	}

	try {
		const wasmBody = new Uint8Array(wasmBytes.byteLength)
		wasmBody.set(wasmBytes)
		const { instance } = await WebAssembly.instantiateStreaming(
			Promise.resolve(
				new Response(wasmBody.buffer, {
					headers: {
						'Content-Type': 'application/wasm',
					},
				}),
			),
			imports,
		)
		return instance
	} catch {
		const instance = await WebAssembly.instantiate(wasmBytes, imports)
		return instance
	}
}

let internal: Record<string, unknown>

if (typeof window !== 'undefined') {
	const internalModulePromise = loadInternalModule()
	const instance = await loadBinInspectWasm(internalModulePromise)
	internal = await internalModulePromise
	const wasm = instance.exports as unknown as { __wbindgen_start: () => void }
	;(internal.__wbg_set_wasm as (value: WebAssembly.Exports) => void)(
		instance.exports,
	)
	wasm.__wbindgen_start()
} else {
	internal = {
		analyze: () => {
			throw new Error(
				'BinInspect runtime is only available in the browser.',
			)
		},
		api_version: () => {
			throw new Error(
				'BinInspect runtime is only available in the browser.',
			)
		},
	}
}

export const analyze = internal.analyze as unknown as (
	bytes: Uint8Array,
) => BinInspectTypes.AnalysisReport
export const apiVersion = internal.api_version as unknown as () => string
