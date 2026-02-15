CREATE TABLE IF NOT EXISTS "bininspect_artifacts" (
	"version" text PRIMARY KEY NOT NULL,
	"types" text NOT NULL,
	"internal_js" text NOT NULL,
	"wasm_base64" text NOT NULL,
	"binary_base64" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
