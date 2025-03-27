CREATE TABLE "banks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"bank_id" text,
	"tombstone" boolean DEFAULT false
);
