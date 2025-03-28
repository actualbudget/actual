CREATE TABLE "categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"is_income" boolean DEFAULT false,
	"cat_group" varchar(36),
	"sort_order" bigint,
	"hidden" boolean DEFAULT false,
	"goal_def" jsonb,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_cat_group_category_groups_id_fk" FOREIGN KEY ("cat_group") REFERENCES "public"."category_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_cat_group_index" ON "categories" USING btree ("cat_group");--> statement-breakpoint
CREATE INDEX "categories_is_income_index" ON "categories" USING btree ("is_income");--> statement-breakpoint
CREATE INDEX "categories_hidden_index" ON "categories" USING btree ("hidden");--> statement-breakpoint
CREATE INDEX "categories_sort_order_index" ON "categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "categories_tombstone_index" ON "categories" USING btree ("tombstone");