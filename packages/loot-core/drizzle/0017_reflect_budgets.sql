CREATE TABLE "reflect_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"month" date,
	"category" varchar(36),
	"amount" bigint,
	"carryover" boolean DEFAULT false,
	"goal" bigint,
	"long_goal" bigint
);
--> statement-breakpoint
ALTER TABLE "reflect_budgets" ADD CONSTRAINT "reflect_budgets_category_categories_id_fk" FOREIGN KEY ("category") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reflect_budgets_month_index" ON "reflect_budgets" USING btree ("month");--> statement-breakpoint
CREATE INDEX "reflect_budgets_category_index" ON "reflect_budgets" USING btree ("category");