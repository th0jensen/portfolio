CREATE TABLE "locale_metadata" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alt_name" text NOT NULL,
	"description" text NOT NULL,
	"footer_text" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "locale_meta" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "locale_nav" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"work" text NOT NULL,
	"experience" text NOT NULL,
	"contact" text NOT NULL,
	"open_menu" text NOT NULL,
	"close_menu" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "locale_about" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birthday" text NOT NULL,
	"human_languages" jsonb NOT NULL,
	"computer_languages" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "locale_hero" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"description" text NOT NULL,
	"explore_work" text NOT NULL,
	"github" text NOT NULL,
	"linkedin" text NOT NULL,
	"headshot_alt" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "locale_work" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"subtitle" text NOT NULL,
	"title" text NOT NULL,
	"show_more" text NOT NULL,
	"show_less" text NOT NULL,
	"visit_project" text NOT NULL,
	"download_app_store" text NOT NULL,
	"view_on_github" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "locale_projects" (
	"locale" "locale_code" NOT NULL,
	"project_index" integer NOT NULL,
	"name" text NOT NULL,
	"status" text,
	"image_url" text NOT NULL,
	"technologies" jsonb NOT NULL,
	"description" text NOT NULL,
	"source_type" text,
	"source_link" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locale_projects_locale_project_index_pk" PRIMARY KEY("locale","project_index")
);--> statement-breakpoint
CREATE TABLE "locale_experience" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"subtitle" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "locale_theme" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"light" text NOT NULL,
	"dark" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "locale_footer" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"copyright" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "locale_buttons" (
	"locale" "locale_code" PRIMARY KEY NOT NULL,
	"github" text NOT NULL,
	"linkedin" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DROP TABLE IF EXISTS "locale_translations";--> statement-breakpoint
DROP TYPE IF EXISTS "locale_namespace";
