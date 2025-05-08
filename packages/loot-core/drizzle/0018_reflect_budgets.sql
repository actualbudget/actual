CREATE TABLE "actual"."reflect_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"month" date,
	"category" varchar(36),
	"amount" bigint,
	"carryover" boolean DEFAULT false,
	"goal" bigint,
	"long_goal" bigint
);
--> statement-breakpoint
ALTER TABLE "actual"."reflect_budgets" ADD CONSTRAINT "reflect_budgets_category_categories_id_fk" FOREIGN KEY ("category") REFERENCES "actual"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reflect_budgets_month_category_index" ON "actual"."reflect_budgets" USING btree ("month","category");