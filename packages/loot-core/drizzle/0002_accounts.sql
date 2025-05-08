CREATE TABLE "actual"."accounts" (
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
ALTER TABLE "actual"."accounts" ADD CONSTRAINT "accounts_bank_banks_id_fk" FOREIGN KEY ("bank") REFERENCES "actual"."banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_name_index" ON "actual"."accounts" USING btree ("name") WHERE "actual"."accounts"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "accounts_bank_index" ON "actual"."accounts" USING btree ("bank") WHERE "actual"."accounts"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "accounts_sort_order_name_index" ON "actual"."accounts" USING btree ("sort_order","name");