import pg from 'pg'

interface MigrationJournalEntry {
	idx: number
	tag: string
}

interface MigrationJournal {
	entries: MigrationJournalEntry[]
}

const connectionString = Deno.env.get('DATABASE_URL')
const QUERY_TIMEOUT_MS = 30_000
const CONNECTION_TIMEOUT_MS = 10_000

if (!connectionString) {
	throw new Error('DATABASE_URL is missing for migrations.')
}

const pool = new pg.Pool({
	connectionString,
	max: 1,
	connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
	idleTimeoutMillis: 1_000,
	query_timeout: QUERY_TIMEOUT_MS,
	statement_timeout: QUERY_TIMEOUT_MS,
})

async function closePool(timeoutMs = 5000): Promise<void> {
	let closed = false
	const closePromise = pool.end().then(() => {
		closed = true
	}).catch((error) => {
		console.error('Failed to close migration DB pool cleanly:', error)
	})

	await Promise.race([
		closePromise,
		new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
	])

	if (!closed) {
		console.warn(
			`Migration DB pool close timed out after ${timeoutMs}ms; proceeding with process exit.`,
		)
	}
}

function normalizeSql(rawSql: string): string {
	return rawSql
		.replaceAll(/-->\s*statement-breakpoint/g, '')
		.trim()
}

function getPgErrorCode(error: unknown): string | undefined {
	if (typeof error === 'object' && error !== null && 'code' in error) {
		const code = (error as { code?: unknown }).code
		return typeof code === 'string' ? code : undefined
	}
	return undefined
}

function isDuplicateObjectError(error: unknown): boolean {
	const code = getPgErrorCode(error)
	// duplicate_table, duplicate_object, duplicate_schema
	return code === '42P07' || code === '42710' || code === '42P06'
}

function splitSqlStatements(sqlText: string): string[] {
	return sqlText
		.split(';')
		.map((statement) => statement.trim())
		.filter((statement) => statement.length > 0)
		.map((statement) => `${statement};`)
}

async function readMigrationJournal(): Promise<MigrationJournalEntry[]> {
	const journalPath = new URL(
		'../../drizzle/meta/_journal.json',
		import.meta.url,
	)
	const journalText = await Deno.readTextFile(journalPath)
	const journal = JSON.parse(journalText) as MigrationJournal
	return journal.entries.sort((a, b) => a.idx - b.idx)
}

async function ensureMigrationTable(client: pg.PoolClient): Promise<void> {
	await queryWithTimeout(client, 'CREATE SCHEMA IF NOT EXISTS drizzle')
	await queryWithTimeout(
		client,
		`
			CREATE TABLE IF NOT EXISTS drizzle.__sql_migrations (
				tag text PRIMARY KEY NOT NULL,
				applied_at timestamp with time zone DEFAULT now() NOT NULL
			)
		`,
	)
}

async function hasMigration(
	client: pg.PoolClient,
	tag: string,
): Promise<boolean> {
	const result = await queryWithTimeout(
		client,
		'SELECT 1 FROM drizzle.__sql_migrations WHERE tag = $1 LIMIT 1',
		[tag],
	)
	return (result.rowCount ?? 0) > 0
}

async function queryWithTimeout<T extends pg.QueryResult>(
	client: pg.PoolClient,
	text: string,
	values?: unknown[],
	timeoutMs = QUERY_TIMEOUT_MS,
): Promise<T> {
	const queryPromise = client.query(text, values) as Promise<T>
	return await Promise.race([
		queryPromise,
		new Promise<T>((_, reject) =>
			setTimeout(
				() => reject(new Error(`Query timeout after ${timeoutMs}ms`)),
				timeoutMs,
			)
		),
	])
}

async function applyMigration(
	client: pg.PoolClient,
	tag: string,
	sqlText: string,
): Promise<void> {
	const safeRollback = async () => {
		try {
			await queryWithTimeout(client, 'ROLLBACK', undefined, 5_000)
		} catch {
			// Ignore rollback timeout/failure so migration exits quickly.
		}
	}

	await queryWithTimeout(client, 'BEGIN')
	try {
		await queryWithTimeout(client, sqlText)
		await queryWithTimeout(
			client,
			'INSERT INTO drizzle.__sql_migrations (tag) VALUES ($1)',
			[tag],
		)
		await queryWithTimeout(client, 'COMMIT')
		return
	} catch (error) {
		await safeRollback()
		if (!isDuplicateObjectError(error)) {
			throw error
		}
	}

	// If the full migration failed only because some objects already exist,
	// re-run statement-by-statement and skip duplicate-object statements.
	await queryWithTimeout(client, 'BEGIN')
	try {
		const statements = splitSqlStatements(sqlText)
		for (const statement of statements) {
			try {
				await queryWithTimeout(client, statement)
			} catch (statementError) {
				if (!isDuplicateObjectError(statementError)) {
					throw statementError
				}
			}
		}
		await queryWithTimeout(
			client,
			'INSERT INTO drizzle.__sql_migrations (tag) VALUES ($1) ON CONFLICT (tag) DO NOTHING',
			[tag],
		)
		await queryWithTimeout(client, 'COMMIT')
	} catch (error) {
		await safeRollback()
		throw error
	}
}

async function migrate(): Promise<void> {
	const client = await pool.connect()
	try {
		await ensureMigrationTable(client)
		const entries = await readMigrationJournal()

		for (const entry of entries) {
			const alreadyApplied = await hasMigration(client, entry.tag)
			if (alreadyApplied) {
				console.log(
					`Skipping migration ${entry.tag} (already applied).`,
				)
				continue
			}

			const migrationPath = new URL(
				`../../drizzle/${entry.tag}.sql`,
				import.meta.url,
			)
			const rawSql = await Deno.readTextFile(migrationPath)
			const sqlText = normalizeSql(rawSql)
			if (!sqlText) {
				console.log(`Skipping migration ${entry.tag} (empty file).`)
				continue
			}

			await applyMigration(client, entry.tag, sqlText)
			console.log(`Applied migration ${entry.tag}.`)
		}

		console.log('SQL migrations complete.')
	} finally {
		client.release(true)
	}
}

let exitCode = 0

try {
	await migrate()
} catch (error) {
	exitCode = 1
	console.error('Migration failed:', error)
} finally {
	await closePool()
}

Deno.exit(exitCode)
