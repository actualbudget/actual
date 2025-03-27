CREATE TABLE "transaction_filters" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"conditions" jsonb,
	"conditions_op" text,
	"tombstone" boolean DEFAULT false
);
