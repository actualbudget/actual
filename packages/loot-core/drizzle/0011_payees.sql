CREATE TABLE "actual"."payees" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"transfer_acct" varchar(36),
	"favorite" boolean DEFAULT false,
	"learn_categories" boolean DEFAULT true,
	"tombstone" boolean DEFAULT false,
	"category" text
);
--> statement-breakpoint
ALTER TABLE "actual"."payees" ADD CONSTRAINT "payees_transfer_acct_accounts_id_fk" FOREIGN KEY ("transfer_acct") REFERENCES "actual"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payees_name_index" ON "actual"."payees" USING btree ("name") WHERE "actual"."payees"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "payees_transfer_acct_name_index" ON "actual"."payees" USING btree ("transfer_acct" DESC NULLS FIRST,LOWER("name")) WHERE "actual"."payees"."tombstone" IS FALSE;