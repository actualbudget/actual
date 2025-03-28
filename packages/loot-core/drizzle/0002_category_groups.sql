CREATE TABLE "category_groups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"is_income" boolean DEFAULT false,
	"sort_order" bigint,
	"hidden" boolean DEFAULT false,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "category_groups_is_income_index" ON "category_groups" USING btree ("is_income");--> statement-breakpoint
CREATE INDEX "category_groups_hidden_index" ON "category_groups" USING btree ("hidden");--> statement-breakpoint
CREATE INDEX "category_groups_sort_order_index" ON "category_groups" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "category_groups_tombstone_index" ON "category_groups" USING btree ("tombstone");