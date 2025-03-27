CREATE TABLE "rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"stage" text,
	"conditions" jsonb,
	"actions" jsonb,
	"tombstone" boolean DEFAULT false,
	"conditions_op" text
);
