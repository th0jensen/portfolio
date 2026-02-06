CREATE TABLE "asset_images" (
	"key" text PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"data_base64" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
