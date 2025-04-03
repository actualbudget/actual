CREATE TABLE "actual"."banks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"bank_id" text,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "banks_bank_id_index" ON "actual"."banks" USING btree ("bank_id") WHERE "actual"."banks"."tombstone" IS FALSE;