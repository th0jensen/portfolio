CREATE TYPE "public"."locale_code" AS ENUM('en', 'no', 'he');--> statement-breakpoint
CREATE TYPE "public"."locale_namespace" AS ENUM('common');--> statement-breakpoint
CREATE TABLE "locale_translations" (
	"locale" "locale_code" NOT NULL,
	"namespace" "locale_namespace" DEFAULT 'common' NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locale_translations_locale_namespace_pk" PRIMARY KEY("locale","namespace")
);
