CREATE TABLE "payee_mapping" (
	"id" varchar(36),
	"targetId" varchar(36)
);
--> statement-breakpoint
ALTER TABLE "payee_mapping" ADD CONSTRAINT "payee_mapping_id_payees_id_fk" FOREIGN KEY ("id") REFERENCES "public"."payees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payee_mapping" ADD CONSTRAINT "payee_mapping_targetId_payees_id_fk" FOREIGN KEY ("targetId") REFERENCES "public"."payees"("id") ON DELETE no action ON UPDATE no action;