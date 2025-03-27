CREATE TABLE "category_mapping" (
	"id" varchar(36),
	"transferId" varchar(36)
);
--> statement-breakpoint
ALTER TABLE "category_mapping" ADD CONSTRAINT "category_mapping_id_categories_id_fk" FOREIGN KEY ("id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_mapping" ADD CONSTRAINT "category_mapping_transferId_categories_id_fk" FOREIGN KEY ("transferId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;