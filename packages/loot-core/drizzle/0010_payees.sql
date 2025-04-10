CREATE TABLE "payees" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"transfer_acct" varchar(36),
	"favorite" boolean DEFAULT false,
	"learn_categories" boolean DEFAULT true,
	"tombstone" boolean DEFAULT false,
	"category" text
);
--> statement-breakpoint
ALTER TABLE "payees" ADD CONSTRAINT "payees_transfer_acct_accounts_id_fk" FOREIGN KEY ("transfer_acct") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payees_name_index" ON "payees" USING btree ("name") WHERE "payees"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "payees_transfer_acct_index" ON "payees" USING btree ("transfer_acct" NULLS FIRST) WHERE "payees"."tombstone" IS FALSE;