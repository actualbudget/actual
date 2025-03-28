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
CREATE INDEX "payees_transfer_acct_index" ON "payees" USING btree ("transfer_acct");--> statement-breakpoint
CREATE INDEX "payees_favorite_index" ON "payees" USING btree ("favorite");--> statement-breakpoint
CREATE INDEX "payees_learn_categories_index" ON "payees" USING btree ("learn_categories");--> statement-breakpoint
CREATE INDEX "payees_tombstone_index" ON "payees" USING btree ("tombstone");