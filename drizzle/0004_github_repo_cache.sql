CREATE TABLE "github_repo_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"repos" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
