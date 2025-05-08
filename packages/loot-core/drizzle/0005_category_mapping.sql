CREATE TABLE "actual"."category_mapping" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"transfer_id" varchar(36)
);
--> statement-breakpoint
ALTER TABLE "actual"."category_mapping" ADD CONSTRAINT "category_mapping_id_categories_id_fk" FOREIGN KEY ("id") REFERENCES "actual"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual"."category_mapping" ADD CONSTRAINT "category_mapping_transfer_id_categories_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "actual"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_mapping_transfer_id_index" ON "actual"."category_mapping" USING btree ("transfer_id");