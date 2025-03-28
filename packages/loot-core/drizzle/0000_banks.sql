CREATE TABLE "banks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"bank_id" text,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "banks_bank_id_index" ON "banks" USING btree ("bank_id") WHERE "banks"."tombstone" IS FALSE;