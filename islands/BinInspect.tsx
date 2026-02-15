import { useEffect, useMemo, useState } from 'preact/hooks'
import { analyze, apiVersion } from '~/lib/bininspect.ts'
import type {
	AnalysisReport,
	CodeSignInfo,
	Severity,
} from '~/lib/bininspect.ts'

const SAMPLE_BINARY_LOAD_URL = '/wasm/bininspect_wasm.wasm'
const SAMPLE_BINARY_DOWNLOAD_URL =
	'https://github.com/th0jensen/bininspect/releases/latest/download/bininspect_wasm.wasm'

type TabKey =
	| 'overview'
	| 'findings'
	| 'sections'
	| 'imports'
	| 'exports'
	| 'symbols'
	| 'strings'
	| 'raw'

const TABS: Array<{ key: TabKey; label: string }> = [
	{ key: 'overview', label: 'Summary' },
	{ key: 'findings', label: 'Alerts' },
	{ key: 'sections', label: 'File Parts' },
	{ key: 'imports', label: 'Dependencies' },
	{ key: 'exports', label: 'Exposed Items' },
	{ key: 'symbols', label: 'Named Items' },
	{ key: 'strings', label: 'Text Found' },
	{ key: 'raw', label: 'Raw Data' },
]

function formatBytes(value: number): string {
	const units = ['B', 'KB', 'MB', 'GB']
	let current = value
	let unitIndex = 0
	while (current >= 1024 && unitIndex < units.length - 1) {
		current /= 1024
		unitIndex += 1
	}
	const precision = current < 10 && unitIndex > 0 ? 2 : 1
	return `${current.toFixed(precision)} ${units[unitIndex]}`
}

function formatAddr(value: number | bigint | undefined): string {
	if (value === undefined) return '-'
	const asBigInt = typeof value === 'bigint' ? value : BigInt(value)
	return `0x${asBigInt.toString(16)}`
}

function formatDurationMs(value: number): string {
	if (value < 1000) return `${value} ms`
	return `${(value / 1000).toFixed(2)} s`
}

function formatBinaryPlatform(
	format: AnalysisReport['binary']['format'],
): string {
	switch (format) {
		case 'pe':
			return 'Windows'
		case 'elf':
			return 'Linux'
		case 'mach_o':
			return 'macOS'
		case 'wasm':
			return 'Web'
		default:
			return 'Unknown'
	}
}

function waitForNextPaint(): Promise<void> {
	return new Promise((resolve) => {
		if (typeof requestAnimationFrame === 'function') {
			requestAnimationFrame(() => resolve())
			return
		}
		setTimeout(() => resolve(), 0)
	})
}

function severityClasses(severity: Severity): string {
	switch (severity) {
		case 'high':
			return 'bg-red-500/15 text-red-300 border-red-500/25'
		case 'medium':
			return 'bg-amber-500/15 text-amber-300 border-amber-500/25'
		case 'low':
			return 'bg-blue-500/15 text-blue-300 border-blue-500/25'
		case 'info':
		default:
			return 'bg-foreground/10 text-foreground border-border/50'
	}
}

interface BinInspectProps {
	locale?: string
}

function valueMatches(query: string, values: unknown[]): boolean {
	if (!query) return true
	return values.some((value) =>
		String(value ?? '').toLowerCase().includes(query)
	)
}

function codeSignRows(codeSign: CodeSignInfo) {
	return [
		{
			key: 'present',
			label: 'Signature Present',
			value: String(codeSign.present),
		},
		{
			key: 'identifier',
			label: 'App Identifier',
			value: codeSign.identifier || '-',
		},
		{ key: 'flags', label: 'Security Flags', value: codeSign.flags ?? '-' },
		{
			key: 'hash_type',
			label: 'Hash Type',
			value: codeSign.hash_type || '-',
		},
		{
			key: 'page_size',
			label: 'Page Size',
			value: codeSign.page_size ?? '-',
		},
		{
			key: 'code_limit',
			label: 'Signed Size',
			value: codeSign.code_limit ?? '-',
		},
		{
			key: 'cdhash',
			label: 'Signature Hash',
			value: codeSign.cdhash || '-',
		},
		{
			key: 'has_cms_signature',
			label: 'Developer Certificate',
			value: String(codeSign.has_cms_signature),
		},
		{
			key: 'entitlements',
			label: 'Permissions',
			value: codeSign.entitlements || '-',
		},
		{
			key: 'verified',
			label: 'Integrity Check',
			value: String(codeSign.code_directory_hashes_verified ?? false),
		},
		{
			key: 'verified_pages',
			label: 'Verified Chunks',
			value: codeSign.verified_pages ?? '-',
		},
		{
			key: 'total_pages',
			label: 'Total Chunks',
			value: codeSign.total_pages ?? '-',
		},
		{
			key: 'mismatch_pages',
			label: 'Mismatched Chunks',
			value: codeSign.mismatch_pages.length
				? codeSign.mismatch_pages.join(', ')
				: '-',
		},
	]
}

export default function BinInspect({ locale = 'en' }: BinInspectProps) {
	const [fileName, setFileName] = useState('')
	const [inputBytes, setInputBytes] = useState<Uint8Array | null>(null)
	const [report, setReport] = useState<AnalysisReport | null>(null)
	const [analyzerVersion, setAnalyzerVersion] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<TabKey>('overview')
	const [query, setQuery] = useState('')
	const [severityFilter, setSeverityFilter] = useState<'all' | Severity>(
		'all',
	)
	const [rowLimit, setRowLimit] = useState(100)
	const [isBusy, setIsBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(
		null,
	)
	const [analysisElapsedMs, setAnalysisElapsedMs] = useState(0)
	const [lastAnalysisDurationMs, setLastAnalysisDurationMs] = useState<
		number | null
	>(null)
	const hasLoadedFile = inputBytes !== null
	const loadedFileSize = inputBytes
		? formatBytes(inputBytes.byteLength)
		: null

	useEffect(() => {
		if (!isBusy || analysisStartedAt === null) return

		const tick = () => {
			setAnalysisElapsedMs(Date.now() - analysisStartedAt)
		}

		tick()
		const interval = setInterval(tick, 50)
		return () => clearInterval(interval)
	}, [analysisStartedAt, isBusy])

	const normalizedQuery = query.trim().toLowerCase()

	const filteredFindings = useMemo(() => {
		if (!report) return []
		return report.findings
			.filter((finding) => {
				if (severityFilter === 'all') return true
				return finding.severity === severityFilter
			})
			.filter((finding) =>
				valueMatches(normalizedQuery, [
					finding.title,
					finding.details,
					finding.evidence.join(' '),
					finding.severity,
				])
			)
			.slice(0, rowLimit)
	}, [normalizedQuery, report, rowLimit, severityFilter])

	const filteredSections = useMemo(() => {
		if (!report) return []
		return report.sections
			.filter((section) =>
				valueMatches(normalizedQuery, [
					section.name,
					section.flags.join(' '),
					section.offset,
					section.size,
					section.entropy,
				])
			)
			.slice(0, rowLimit)
	}, [normalizedQuery, report, rowLimit])

	const filteredImports = useMemo(() => {
		if (!report) return []
		return report.imports
			.filter((importInfo) =>
				valueMatches(normalizedQuery, [
					importInfo.library,
					importInfo.symbol,
				])
			)
			.slice(0, rowLimit)
	}, [normalizedQuery, report, rowLimit])

	const filteredExports = useMemo(() => {
		if (!report) return []
		return report.exports
			.filter((exportInfo) =>
				valueMatches(normalizedQuery, [
					exportInfo.symbol,
					exportInfo.addr,
				])
			)
			.slice(0, rowLimit)
	}, [normalizedQuery, report, rowLimit])

	const filteredSymbols = useMemo(() => {
		if (!report) return []
		return report.symbols
			.filter((symbol) =>
				valueMatches(normalizedQuery, [
					symbol.name,
					symbol.kind,
					symbol.addr,
				])
			)
			.slice(0, rowLimit)
	}, [normalizedQuery, report, rowLimit])

	const filteredStrings = useMemo(() => {
		if (!report) return []
		return report.strings
			.filter((entry) =>
				valueMatches(normalizedQuery, [entry.offset, entry.value])
			)
			.slice(0, rowLimit)
	}, [normalizedQuery, report, rowLimit])

	const totalVisibleRows = filteredFindings.length +
		filteredSections.length +
		filteredImports.length +
		filteredExports.length +
		filteredSymbols.length +
		filteredStrings.length

	function analyzeBytes(bytes: Uint8Array, label: string) {
		setError(null)
		setIsBusy(true)
		const startedAt = Date.now()
		setAnalysisStartedAt(startedAt)
		setAnalysisElapsedMs(0)
		try {
			const nextReport = analyze(bytes)
			setReport(nextReport)
			setFileName(label)
			setAnalyzerVersion(apiVersion())
			setLastAnalysisDurationMs(Date.now() - startedAt)
			setActiveTab('overview')
		} catch (caughtError) {
			const message = caughtError instanceof Error
				? caughtError.message
				: 'Unknown analysis error.'
			setError(message)
			setLastAnalysisDurationMs(null)
		} finally {
			setAnalysisStartedAt(null)
			setIsBusy(false)
		}
	}

	async function handleFile(file: File | null) {
		if (!file) return
		setError(null)
		const bytes = new Uint8Array(await file.arrayBuffer())
		setInputBytes(bytes)
		await analyzeBytes(bytes, file.name)
	}

	async function loadSampleBinary() {
		setError(null)
		setIsBusy(true)
		try {
			const response = await fetch(SAMPLE_BINARY_LOAD_URL)
			if (!response.ok) {
				throw new Error(`Sample download failed (${response.status}).`)
			}
			const bytes = new Uint8Array(await response.arrayBuffer())
			setInputBytes(bytes)
			await analyzeBytes(bytes, 'bininspect_wasm.wasm (sample)')
		} catch (caughtError) {
			const message = caughtError instanceof Error
				? caughtError.message
				: 'Unknown sample-loading error.'
			setError(
				`Could not load the local sample binary (${message}). Download it from the GitHub release link below and upload it manually.`,
			)
			setIsBusy(false)
		}
	}

	async function rerunCurrentInput() {
		if (!inputBytes) {
			setError('Select a binary first.')
			return
		}
		setReport(null)
		setError(null)
		setLastAnalysisDurationMs(null)
		setActiveTab('overview')
		await waitForNextPaint()
		await analyzeBytes(inputBytes, fileName || 'uploaded binary')
	}

	function clearLoadedFile() {
		setInputBytes(null)
		setReport(null)
		setFileName('')
		setError(null)
		setQuery('')
		setSeverityFilter('all')
		setActiveTab('overview')
		setAnalysisStartedAt(null)
		setAnalysisElapsedMs(0)
		setLastAnalysisDurationMs(null)
	}

	return (
		<section class='mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 md:gap-8 md:py-14'>
			<div class='relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 p-7 shadow-sm md:p-10'>
				<div class='pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/5 to-transparent' />
				<div class='flex flex-wrap items-center justify-between gap-3'>
					<div>
						<p class='text-xs uppercase tracking-wide text-muted-foreground'>
							Interactive Demo
						</p>
						<div class='flex items-center'>
							<h1 class='text-3xl font-bold tracking-tight md:text-4xl'>
								BinInspect
							</h1>
							{analyzerVersion
								? (
									<span class='ml-3 inline-flex items-center rounded-md border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground'>
										Version {analyzerVersion}
									</span>
								)
								: null}
						</div>
						<p class='mt-2 max-w-2xl text-sm text-muted-foreground md:text-base'>
							Upload an executable file and get a quick, readable
							summary of what it contains and any notable risk
							signals.
						</p>
					</div>
					<a
						href={`/${locale}/projects`}
						class='inline-flex h-10 items-center rounded-lg border border-border/60 px-4 text-sm font-medium transition-colors hover:bg-muted'
					>
						Back to Projects
					</a>
				</div>

				{!hasLoadedFile
					? (
						<div class='mt-6 flex flex-col items-center gap-4'>
							<label class='relative flex min-h-[160px] w-full max-w-3xl cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/50 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 md:min-h-[180px] md:p-7'>
								<input
									type='file'
									class='absolute inset-0 cursor-pointer opacity-0'
									onChange={(event) =>
										handleFile(
											(event
												.currentTarget as HTMLInputElement)
												.files?.[0] || null,
										)}
								/>
								<span class='text-base font-semibold'>
									Drop an executable file here or click to
									upload
								</span>
								<span class='mt-2 text-xs text-muted-foreground'>
									Supported extensions: .exe, .dll, .so,
									.dylib, .wasm, .elf, .bin
								</span>
								<span class='mt-1 text-xs text-muted-foreground'>
									Any file can be uploaded, but unsupported
									formats may fail or show partial output.
								</span>
							</label>
							<div class='flex w-full max-w-3xl justify-center'>
								<button
									type='button'
									onClick={loadSampleBinary}
									disabled={isBusy}
									class='inline-flex h-11 w-full max-w-[220px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60'
								>
									Load Sample
								</button>
							</div>
							<div class='flex w-full max-w-3xl justify-center text-xs text-muted-foreground'>
								<a
									class='inline-flex w-full justify-center text-center underline underline-offset-2'
									href={SAMPLE_BINARY_DOWNLOAD_URL}
									target='_blank'
									rel='noopener noreferrer'
								>
									Sample Binary (from GitHub)
								</a>
							</div>
						</div>
					)
					: (
						<div class='mt-6 rounded-2xl border border-border/70 bg-background/70 p-4 md:p-5'>
							<div class='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
								<div class='flex items-center gap-3'>
									<div class='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary'>
										<svg
											viewBox='0 0 24 24'
											fill='none'
											stroke='currentColor'
											strokeWidth='2'
											class='h-5 w-5'
										>
											<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
											<path d='M14 2v6h6' />
										</svg>
									</div>
									<div>
										<p class='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
											Loaded File
										</p>
										<p class='max-w-[28rem] truncate text-sm font-semibold md:text-base'>
											{fileName || 'Uploaded binary'}
										</p>
										<div class='mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
											<span class='rounded-md border border-border/60 px-2 py-0.5'>
												{loadedFileSize || '-'}
											</span>
											{report
												? (
													<span class='rounded-md border border-border/60 px-2 py-0.5'>
														{formatBinaryPlatform(
															report.binary
																.format,
														)}
													</span>
												)
												: null}
											{isBusy
												? (
													<span class='rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium text-primary'>
														Scanning{' '}
														{formatDurationMs(
															analysisElapsedMs,
														)}
													</span>
												)
												: lastAnalysisDurationMs !==
														null
												? (
													<span class='rounded-md border border-border/60 px-2 py-0.5'>
														Scan completed in{' '}
														{formatDurationMs(
															lastAnalysisDurationMs,
														)}
													</span>
												)
												: null}
										</div>
									</div>
								</div>

								<div class='flex flex-wrap items-center gap-2'>
									<label class='inline-flex h-10 cursor-pointer items-center rounded-lg border border-border/60 bg-background px-3 text-sm font-medium transition-colors hover:bg-muted'>
										<input
											type='file'
											class='hidden'
											onChange={(event) =>
												handleFile(
													(event
														.currentTarget as HTMLInputElement)
														.files?.[0] || null,
												)}
										/>
										Upload New File
									</label>
									<button
										type='button'
										onClick={rerunCurrentInput}
										disabled={isBusy || !inputBytes}
										class='inline-flex h-10 items-center justify-center rounded-lg border border-border/60 bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
									>
										Scan Again
									</button>
									<button
										type='button'
										onClick={clearLoadedFile}
										class='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
										aria-label='Remove loaded file and clear results'
										title='Clear loaded file'
									>
										<svg
											viewBox='0 0 24 24'
											fill='none'
											stroke='currentColor'
											strokeWidth='2'
											class='h-4 w-4'
										>
											<path d='M18 6 6 18' />
											<path d='m6 6 12 12' />
										</svg>
									</button>
								</div>
							</div>
						</div>
					)}

				{error
					? (
						<div class='mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300'>
							{error}
						</div>
					)
					: null}
			</div>

			{isBusy
				? (
					<div class='rounded-2xl border border-border/60 bg-card/50 p-6 text-sm text-muted-foreground'>
						Scanning file...
					</div>
				)
				: null}

			{report && !isBusy
				? (
					<>
						<div class='rounded-2xl border border-border/60 bg-card/50 p-4'>
							<div class='mb-3 flex flex-wrap items-center gap-2'>
								{TABS.map((tab) => (
									<button
										type='button'
										key={tab.key}
										onClick={() => setActiveTab(tab.key)}
										class={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
											activeTab === tab.key
												? 'bg-primary text-primary-foreground'
												: 'bg-muted/60 text-muted-foreground hover:bg-muted'
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>

							<div class='grid gap-3 md:grid-cols-[1fr_auto_auto]'>
								<input
									type='text'
									value={query}
									onInput={(event) =>
										setQuery(
											(event
												.currentTarget as HTMLInputElement)
												.value,
										)}
									placeholder='Search this report...'
									class='h-10 rounded-lg border border-border/60 bg-background px-3 text-sm outline-none ring-primary/30 transition-shadow focus:ring-2'
								/>
								<select
									value={severityFilter}
									onChange={(event) =>
										setSeverityFilter(
											(event
												.currentTarget as HTMLSelectElement)
												.value as
													| 'all'
													| Severity,
										)}
									class='h-10 rounded-lg border border-border/60 bg-background px-3 text-sm outline-none ring-primary/30 transition-shadow focus:ring-2'
								>
									<option value='all'>
										All alert levels
									</option>
									<option value='high'>High</option>
									<option value='medium'>Medium</option>
									<option value='low'>Low</option>
									<option value='info'>Info</option>
								</select>
								<div class='flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 text-sm'>
									<span class='text-muted-foreground'>
										Max rows
									</span>
									<input
										type='range'
										min={25}
										max={500}
										step={25}
										value={rowLimit}
										onInput={(event) =>
											setRowLimit(
												Number(
													(event
														.currentTarget as HTMLInputElement)
														.value,
												),
											)}
									/>
									<span class='w-10 text-right tabular-nums'>
										{rowLimit}
									</span>
								</div>
							</div>
						</div>

						{activeTab === 'overview'
							? (
								<div class='grid gap-4 lg:grid-cols-3'>
									<div class='rounded-2xl border border-border/60 bg-card/50 p-4'>
										<h2 class='text-sm font-semibold text-muted-foreground'>
											File Snapshot
										</h2>
										<div class='mt-3 space-y-2 text-sm'>
											<div class='flex justify-between gap-4'>
												<span>Platform</span>
												<span class='font-medium'>
													{formatBinaryPlatform(
														report.binary.format,
													)}
												</span>
											</div>
											<div class='flex justify-between gap-4'>
												<span>CPU Type</span>
												<span class='font-medium'>
													{report.binary.arch}
												</span>
											</div>
											<div class='flex justify-between gap-4'>
												<span>Start Address</span>
												<span class='font-medium'>
													{formatAddr(
														report.binary
															.entrypoint,
													)}
												</span>
											</div>
											<div class='flex justify-between gap-4'>
												<span>File Size</span>
												<span class='font-medium'>
													{formatBytes(
														report.binary.file_size,
													)}
												</span>
											</div>
											<div class='flex justify-between gap-4'>
												<span>File Signature</span>
												<span class='font-medium'>
													{report.binary.magic}
												</span>
											</div>
											<div class='flex justify-between gap-4'>
												<span>Debug Names Removed</span>
												<span class='font-medium'>
													{String(
														report.binary
															.is_stripped,
													)}
												</span>
											</div>
											<div class='flex justify-between gap-4'>
												<span>Has Debug Info</span>
												<span class='font-medium'>
													{String(
														report.binary.has_debug,
													)}
												</span>
											</div>
										</div>
									</div>

									<div class='rounded-2xl border border-border/60 bg-card/50 p-4'>
										<h2 class='text-sm font-semibold text-muted-foreground'>
											File Fingerprints
										</h2>
										<div class='mt-3 space-y-3 text-sm'>
											<div>
												<p class='text-xs text-muted-foreground'>
													SHA-256
												</p>
												<p class='break-all font-mono text-xs'>
													{report.hashes.sha256}
												</p>
											</div>
											<div>
												<p class='text-xs text-muted-foreground'>
													SHA-1
												</p>
												<p class='break-all font-mono text-xs'>
													{report.hashes.sha1}
												</p>
											</div>
										</div>
									</div>

									<div class='rounded-2xl border border-border/60 bg-card/50 p-4'>
										<h2 class='text-sm font-semibold text-muted-foreground'>
											At a Glance
										</h2>
										<div class='mt-3 grid grid-cols-2 gap-2 text-sm'>
											<div class='rounded-lg border border-border/50 p-2 text-center'>
												<p class='text-xs text-muted-foreground'>
													Alerts
												</p>
												<p class='text-lg font-semibold'>
													{report.findings.length}
												</p>
											</div>
											<div class='rounded-lg border border-border/50 p-2 text-center'>
												<p class='text-xs text-muted-foreground'>
													File Parts
												</p>
												<p class='text-lg font-semibold'>
													{report.sections.length}
												</p>
											</div>
											<div class='rounded-lg border border-border/50 p-2 text-center'>
												<p class='text-xs text-muted-foreground'>
													Dependencies
												</p>
												<p class='text-lg font-semibold'>
													{report.imports.length}
												</p>
											</div>
											<div class='rounded-lg border border-border/50 p-2 text-center'>
												<p class='text-xs text-muted-foreground'>
													Exposed Items
												</p>
												<p class='text-lg font-semibold'>
													{report.exports.length}
												</p>
											</div>
											<div class='rounded-lg border border-border/50 p-2 text-center'>
												<p class='text-xs text-muted-foreground'>
													Named Items
												</p>
												<p class='text-lg font-semibold'>
													{report.symbols.length}
												</p>
											</div>
											<div class='rounded-lg border border-border/50 p-2 text-center'>
												<p class='text-xs text-muted-foreground'>
													Text Found
												</p>
												<p class='text-lg font-semibold'>
													{report.strings.length}
												</p>
											</div>
										</div>
										<p class='mt-3 text-xs text-muted-foreground'>
											Visible rows: {totalVisibleRows}
										</p>
									</div>

									{report.codesign
										? (
											<div class='rounded-2xl border border-border/60 bg-card/50 p-4 lg:col-span-3'>
												<h2 class='text-sm font-semibold text-muted-foreground'>
													Publisher Signature
												</h2>
												<div class='mt-3 grid gap-2 md:grid-cols-2'>
													{codeSignRows(
														report.codesign,
													).map(
														(row) => (
															<div
																key={row.key}
																class='flex items-start justify-between gap-4 rounded-lg border border-border/50 p-2 text-sm'
															>
																<span class='text-muted-foreground'>
																	{row.label}
																</span>
																<span class='text-right font-medium'>
																	{String(
																		row.value,
																	)}
																</span>
															</div>
														),
													)}
												</div>
											</div>
										)
										: null}
								</div>
							)
							: null}

						{activeTab === 'findings'
							? (
								<div class='space-y-3'>
									{filteredFindings.length === 0
										? (
											<p class='rounded-xl border border-border/50 p-4 text-sm text-muted-foreground'>
												No alerts match this filter.
											</p>
										)
										: filteredFindings.map((
											finding,
											index,
										) => (
											<div
												key={`${finding.title}-${index}`}
												class='rounded-xl border border-border/60 bg-card/50 p-4'
											>
												<div class='mb-2 flex flex-wrap items-center gap-2'>
													<span
														class={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
															severityClasses(
																finding
																	.severity,
															)
														}`}
													>
														{finding.severity
															.toUpperCase()}
													</span>
													<h3 class='text-base font-semibold'>
														{finding.title}
													</h3>
												</div>
												<p class='text-sm text-muted-foreground'>
													{finding.details}
												</p>
												{finding.evidence.length
													? (
														<ul class='mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground'>
															{finding.evidence
																.map((
																	evidence,
																	evidenceIndex,
																) => (
																	<li
																		key={`${evidence}-${evidenceIndex}`}
																		class='break-all'
																	>
																		{evidence}
																	</li>
																))}
														</ul>
													)
													: null}
											</div>
										))}
								</div>
							)
							: null}

						{activeTab === 'sections'
							? (
								<div class='overflow-x-auto rounded-xl border border-border/60'>
									<table class='w-full min-w-[760px] text-left text-sm'>
										<thead class='bg-muted/50 text-xs uppercase text-muted-foreground'>
											<tr>
												<th class='px-3 py-2'>Name</th>
												<th class='px-3 py-2'>
													Address
												</th>
												<th class='px-3 py-2'>
													Offset
												</th>
												<th class='px-3 py-2'>Size</th>
												<th class='px-3 py-2'>
													Entropy
												</th>
												<th class='px-3 py-2'>Flags</th>
											</tr>
										</thead>
										<tbody>
											{filteredSections.map((
												section,
												index,
											) => (
												<tr
													key={`${section.name}-${index}`}
													class='border-t border-border/50'
												>
													<td class='px-3 py-2 font-medium'>
														{section.name}
													</td>
													<td class='px-3 py-2 font-mono text-xs'>
														{formatAddr(
															section.addr,
														)}
													</td>
													<td class='px-3 py-2 font-mono text-xs'>
														{formatAddr(
															section.offset,
														)}
													</td>
													<td class='px-3 py-2'>
														{formatBytes(
															section.size,
														)}
													</td>
													<td class='px-3 py-2'>
														{section.entropy ===
																undefined
															? '-'
															: section.entropy
																.toFixed(4)}
													</td>
													<td class='px-3 py-2'>
														{section.flags.join(
															', ',
														) || '-'}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)
							: null}

						{activeTab === 'imports'
							? (
								<div class='overflow-x-auto rounded-xl border border-border/60'>
									<table class='w-full min-w-[620px] text-left text-sm'>
										<thead class='bg-muted/50 text-xs uppercase text-muted-foreground'>
											<tr>
												<th class='px-3 py-2'>
													Library
												</th>
												<th class='px-3 py-2'>
													Symbol
												</th>
											</tr>
										</thead>
										<tbody>
											{filteredImports.map((
												item,
												index,
											) => (
												<tr
													key={`${item.library}-${item.symbol}-${index}`}
													class='border-t border-border/50'
												>
													<td class='px-3 py-2'>
														{item.library || '-'}
													</td>
													<td class='px-3 py-2 font-mono text-xs'>
														{item.symbol}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)
							: null}

						{activeTab === 'exports'
							? (
								<div class='overflow-x-auto rounded-xl border border-border/60'>
									<table class='w-full min-w-[520px] text-left text-sm'>
										<thead class='bg-muted/50 text-xs uppercase text-muted-foreground'>
											<tr>
												<th class='px-3 py-2'>
													Symbol
												</th>
												<th class='px-3 py-2'>
													Address
												</th>
											</tr>
										</thead>
										<tbody>
											{filteredExports.map((
												item,
												index,
											) => (
												<tr
													key={`${item.symbol}-${index}`}
													class='border-t border-border/50'
												>
													<td class='px-3 py-2 font-medium'>
														{item.symbol}
													</td>
													<td class='px-3 py-2 font-mono text-xs'>
														{formatAddr(item.addr)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)
							: null}

						{activeTab === 'symbols'
							? (
								<div class='overflow-x-auto rounded-xl border border-border/60'>
									<table class='w-full min-w-[680px] text-left text-sm'>
										<thead class='bg-muted/50 text-xs uppercase text-muted-foreground'>
											<tr>
												<th class='px-3 py-2'>Name</th>
												<th class='px-3 py-2'>Kind</th>
												<th class='px-3 py-2'>
													Address
												</th>
											</tr>
										</thead>
										<tbody>
											{filteredSymbols.map((
												symbol,
												index,
											) => (
												<tr
													key={`${symbol.name}-${index}`}
													class='border-t border-border/50'
												>
													<td class='px-3 py-2 font-medium'>
														{symbol.name}
													</td>
													<td class='px-3 py-2'>
														{symbol.kind}
													</td>
													<td class='px-3 py-2 font-mono text-xs'>
														{formatAddr(
															symbol.addr,
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)
							: null}

						{activeTab === 'strings'
							? (
								<div class='space-y-2'>
									{filteredStrings.length === 0
										? (
											<p class='rounded-xl border border-border/50 p-4 text-sm text-muted-foreground'>
												No text matches this filter.
											</p>
										)
										: filteredStrings.map((
											stringInfo,
											index,
										) => (
											<div
												key={`${stringInfo.offset}-${index}`}
												class='rounded-xl border border-border/60 bg-card/40 px-3 py-2'
											>
												<p class='text-xs text-muted-foreground'>
													Offset: {formatAddr(
														stringInfo.offset,
													)}
												</p>
												<p class='mt-1 break-all font-mono text-xs'>
													{stringInfo.value}
												</p>
											</div>
										))}
								</div>
							)
							: null}

						{activeTab === 'raw'
							? (
								<pre class='overflow-auto rounded-xl border border-border/60 bg-background/70 p-4 text-xs leading-relaxed'>
									{JSON.stringify(report, null, 2)}
								</pre>
							)
							: null}
					</>
				)
				: null}
		</section>
	)
}
