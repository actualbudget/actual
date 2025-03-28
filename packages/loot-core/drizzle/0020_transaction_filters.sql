CREATE TABLE "transaction_filters" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"conditions" jsonb,
	"conditions_op" text,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "transaction_filters_tombstone_index" ON "transaction_filters" USING btree ("tombstone");