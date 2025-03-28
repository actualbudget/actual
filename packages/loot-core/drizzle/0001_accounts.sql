CREATE TABLE "accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"offbudget" boolean DEFAULT false,
	"closed" boolean DEFAULT false,
	"sort_order" bigint,
	"account_id" text,
	"balance_current" bigint,
	"balance_available" bigint,
	"balance_limit" bigint,
	"mask" text,
	"official_name" text,
	"type" text,
	"subtype" text,
	"bank" varchar(36),
	"account_sync_source" text,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_bank_banks_id_fk" FOREIGN KEY ("bank") REFERENCES "public"."banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_bank_index" ON "accounts" USING btree ("bank");--> statement-breakpoint
CREATE INDEX "accounts_account_id_index" ON "accounts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "accounts_closed_index" ON "accounts" USING btree ("closed");--> statement-breakpoint
CREATE INDEX "accounts_offbudget_index" ON "accounts" USING btree ("offbudget");--> statement-breakpoint
CREATE INDEX "accounts_sort_order_index" ON "accounts" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "accounts_tombstone_index" ON "accounts" USING btree ("tombstone");