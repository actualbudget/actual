CREATE TABLE "messages_clock" (
	"id" integer PRIMARY KEY NOT NULL,
	"clock" jsonb
);
--> statement-breakpoint
CREATE INDEX "messages_clock_clock_index" ON "messages_clock" USING gin ("clock");