import { desc, eq } from 'drizzle-orm'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import z from 'zod'
import { db } from './db.ts'

function withUpdatedAt() {
	return timestamp('updated_at', {
		mode: 'string',
		withTimezone: true,
	}).defaultNow().notNull()
}

const fileSchema = z.object({
	name: z.string().nonoptional(),
	data: z.string().min(1).nonoptional(),
})

export const bininspectUploadSchema = z.object({
	version: z.string().trim().min(1).nonoptional(),
	types: fileSchema.nonoptional(),
	internal: fileSchema.nonoptional(),
	wasm: fileSchema.nonoptional(),
	binary: fileSchema.nonoptional(),
})

export const bininspectArtifacts = pgTable('bininspect_artifacts', {
	version: text('version').primaryKey(),
	types: text('types').notNull(),
	internal: text('internal_js').notNull(),
	wasm: text('wasm_base64').notNull(),
	binary: text('binary_base64').notNull(),
	createdAt: timestamp('created_at', {
		mode: 'string',
		withTimezone: true,
	}).defaultNow().notNull(),
	updatedAt: withUpdatedAt(),
})

interface UpsertBininspectArtifactInput {
	version: string
	types: string
	internal: string
	wasm: string
	binary: string
}

export type BininspectRawAssetName = 'types' | 'internal' | 'wasm' | 'binary'

export type BininspectRawAsset =
	| { name: 'types'; version: string; text: string }
	| { name: 'internal'; version: string; text: string }
	| { name: 'wasm'; version: string; bytes: Uint8Array }
	| { name: 'binary'; version: string; bytes: Uint8Array }

export function bytesToBase64(bytes: Uint8Array): string {
	let binary = ''
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	return btoa(binary)
}

export function base64ToBytes(value: string): Uint8Array {
	const binary = atob(value)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}

export function base64ToText(value: string): string {
	return new TextDecoder().decode(base64ToBytes(value))
}

export async function upsertBininspectArtifact(
	input: UpsertBininspectArtifactInput,
): Promise<void> {
	await db
		.insert(bininspectArtifacts)
		.values({
			version: input.version,
			types: input.types,
			internal: input.internal,
			wasm: input.wasm,
			binary: input.binary,
		})
		.onConflictDoUpdate({
			target: [bininspectArtifacts.version],
			set: {
				types: input.types,
				internal: input.internal,
				wasm: input.wasm,
				binary: input.binary,
				updatedAt: new Date().toISOString(),
			},
		})
}

export async function getBininspectArtifact(
	version?: string,
): Promise<
	| {
		version: string
		types: string
		internal: string
		wasm: string
		binary: string
	}
	| null
> {
	const query = db
		.select({
			version: bininspectArtifacts.version,
			types: bininspectArtifacts.types,
			internal: bininspectArtifacts.internal,
			wasm: bininspectArtifacts.wasm,
			binary: bininspectArtifacts.binary,
		})
		.from(bininspectArtifacts)

	const rows = version
		? await query.where(eq(bininspectArtifacts.version, version)).limit(1)
		: await query.orderBy(desc(bininspectArtifacts.updatedAt)).limit(1)

	if (rows.length === 0) {
		return null
	}

	return rows[0]
}

export async function getBininspectRawAsset(
	name: 'types',
	version?: string,
): Promise<{ name: 'types'; version: string; text: string } | null>
export async function getBininspectRawAsset(
	name: 'internal',
	version?: string,
): Promise<{ name: 'internal'; version: string; text: string } | null>
export async function getBininspectRawAsset(
	name: 'wasm',
	version?: string,
): Promise<{ name: 'wasm'; version: string; bytes: Uint8Array } | null>
export async function getBininspectRawAsset(
	name: 'binary',
	version?: string,
): Promise<{ name: 'binary'; version: string; bytes: Uint8Array } | null>
export async function getBininspectRawAsset(
	name: BininspectRawAssetName,
	version?: string,
): Promise<BininspectRawAsset | null> {
	const artifact = await getBininspectArtifact(version)
	if (!artifact) {
		return null
	}

	switch (name) {
		case 'types':
			return {
				name,
				version: artifact.version,
				text: artifact.types,
			}
		case 'internal':
			return {
				name,
				version: artifact.version,
				text: artifact.internal,
			}
		case 'wasm':
			return {
				name,
				version: artifact.version,
				bytes: base64ToBytes(artifact.wasm),
			}
		case 'binary':
			return {
				name,
				version: artifact.version,
				bytes: base64ToBytes(artifact.binary),
			}
	}
}
