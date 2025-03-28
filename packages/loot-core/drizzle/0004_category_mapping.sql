CREATE TABLE "category_mapping" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"transfer_id" varchar(36)
);
--> statement-breakpoint
ALTER TABLE "category_mapping" ADD CONSTRAINT "category_mapping_id_categories_id_fk" FOREIGN KEY ("id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_mapping" ADD CONSTRAINT "category_mapping_transfer_id_categories_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_mapping_transfer_id_index" ON "category_mapping" USING btree ("transfer_id");