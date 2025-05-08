CREATE TABLE "actual"."notes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE INDEX "notes_note_index" ON "actual"."notes" USING gin ("note" gin_trgm_ops);