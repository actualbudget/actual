CREATE TABLE "category_groups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"is_income" boolean DEFAULT false,
	"sort_order" bigint,
	"hidden" boolean DEFAULT false,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "category_groups_name_index" ON "category_groups" USING btree ("name") WHERE "category_groups"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "category_groups_is_income_sort_order_id_index" ON "category_groups" USING btree ("is_income","sort_order","id");--> statement-breakpoint
CREATE INDEX "category_groups_sort_order_id_index" ON "category_groups" USING btree ("sort_order","id");