CREATE TABLE "transaction_filters" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"conditions" jsonb,
	"conditions_op" text,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "transaction_filters_name_index" ON "transaction_filters" USING btree ("name") WHERE "transaction_filters"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "transaction_filters_conditions_index" ON "transaction_filters" USING gin ("conditions") WHERE "transaction_filters"."tombstone" IS FALSE;