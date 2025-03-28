CREATE TABLE "transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"is_parent" boolean DEFAULT false,
	"is_child" boolean DEFAULT false,
	"acct" varchar(36),
	"category" varchar(36),
	"amount" bigint,
	"description" varchar(36),
	"notes" text,
	"date" date,
	"parent_id" varchar(36),
	"financial_id" text,
	"error" jsonb,
	"imported_description" text,
	"transferred_id" varchar(36),
	"schedule" varchar(36),
	"sort_order" bigint,
	"starting_balance_flag" boolean DEFAULT false,
	"tombstone" boolean DEFAULT false,
	"cleared" boolean DEFAULT true,
	"reconciled" boolean DEFAULT false,
	"pending" boolean,
	"location" text,
	"type" text
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_acct_accounts_id_fk" FOREIGN KEY ("acct") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_categories_id_fk" FOREIGN KEY ("category") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_id_transactions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transferred_id_transactions_id_fk" FOREIGN KEY ("transferred_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_schedule_schedules_id_fk" FOREIGN KEY ("schedule") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_category_date_index" ON "transactions" USING btree ("category","date") WHERE "transactions"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "transactions_acct_index" ON "transactions" USING btree ("acct") WHERE "transactions"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "transactions_parent_id_index" ON "transactions" USING btree ("parent_id") WHERE "transactions"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "transactions_date_starting_balance_flag_sort_order_id_index" ON "transactions" USING btree ("date" DESC NULLS LAST,"starting_balance_flag","sort_order" DESC NULLS LAST,"id");