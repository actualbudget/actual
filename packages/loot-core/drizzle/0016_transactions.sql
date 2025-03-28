CREATE TABLE "transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"isParent" boolean DEFAULT false,
	"isChild" boolean DEFAULT false,
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
CREATE INDEX "transactions_isParent_index" ON "transactions" USING btree ("isParent");--> statement-breakpoint
CREATE INDEX "transactions_isChild_index" ON "transactions" USING btree ("isChild");--> statement-breakpoint
CREATE INDEX "transactions_acct_index" ON "transactions" USING btree ("acct");--> statement-breakpoint
CREATE INDEX "transactions_category_index" ON "transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "transactions_amount_index" ON "transactions" USING btree ("amount");--> statement-breakpoint
CREATE INDEX "transactions_description_index" ON "transactions" USING btree ("description");--> statement-breakpoint
CREATE INDEX "transactions_notes_index" ON "transactions" USING btree ("notes");--> statement-breakpoint
CREATE INDEX "transactions_date_index" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "transactions_parent_id_index" ON "transactions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "transactions_financial_id_index" ON "transactions" USING btree ("financial_id");--> statement-breakpoint
CREATE INDEX "transactions_transferred_id_index" ON "transactions" USING btree ("transferred_id");--> statement-breakpoint
CREATE INDEX "transactions_schedule_index" ON "transactions" USING btree ("schedule");--> statement-breakpoint
CREATE INDEX "transactions_sort_order_index" ON "transactions" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "transactions_starting_balance_flag_index" ON "transactions" USING btree ("starting_balance_flag");--> statement-breakpoint
CREATE INDEX "transactions_cleared_index" ON "transactions" USING btree ("cleared");--> statement-breakpoint
CREATE INDEX "transactions_reconciled_index" ON "transactions" USING btree ("reconciled");--> statement-breakpoint
CREATE INDEX "transactions_tombstone_index" ON "transactions" USING btree ("tombstone");