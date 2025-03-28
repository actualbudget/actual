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
CREATE INDEX "categories_name_index" ON "categories" USING btree ("name") WHERE "categories"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "categories_cat_group_index" ON "categories" USING btree ("cat_group") WHERE "categories"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "categories_sort_order_id_index" ON "categories" USING btree ("sort_order","id");--> statement-breakpoint
CREATE INDEX "categories_goal_def_index" ON "categories" USING btree ("goal_def" NULLS FIRST);