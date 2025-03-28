CREATE TABLE "payee_mapping" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"target_id" varchar(36)
);
--> statement-breakpoint
ALTER TABLE "payee_mapping" ADD CONSTRAINT "payee_mapping_id_payees_id_fk" FOREIGN KEY ("id") REFERENCES "public"."payees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payee_mapping" ADD CONSTRAINT "payee_mapping_target_id_payees_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."payees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payee_mapping_target_id_index" ON "payee_mapping" USING btree ("target_id");