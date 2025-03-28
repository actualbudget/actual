CREATE TABLE "custom_reports" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"start_date" date,
	"end_date" date,
	"date_static" bigint,
	"date_range" text,
	"mode" text,
	"group_by" text,
	"balance_type" text,
	"show_empty" boolean DEFAULT false,
	"show_offbudget" boolean DEFAULT false,
	"show_hidden" boolean DEFAULT false,
	"show_uncategorized" boolean DEFAULT false,
	"selected_categories" text,
	"graph_type" text,
	"conditions" jsonb,
	"conditions_op" text,
	"metadata" jsonb,
	"interval" text,
	"color_scheme" text,
	"include_current" boolean DEFAULT false,
	"sort_by" text,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "custom_reports_name_index" ON "custom_reports" USING btree ("name") WHERE "custom_reports"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "custom_reports_conditions_index" ON "custom_reports" USING gin ("conditions") WHERE "custom_reports"."tombstone" IS FALSE;