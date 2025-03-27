CREATE TABLE "zero_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"month" date,
	"category" varchar(36),
	"amount" bigint,
	"carryover" boolean DEFAULT false,
	"goal" bigint,
	"long_goal" bigint
);
--> statement-breakpoint
ALTER TABLE "zero_budgets" ADD CONSTRAINT "zero_budgets_category_categories_id_fk" FOREIGN KEY ("category") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;