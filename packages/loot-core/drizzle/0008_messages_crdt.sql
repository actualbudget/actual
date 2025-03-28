CREATE TABLE "messages_crdt" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" text,
	"dataset" text,
	"row" varchar(36),
	"column" text,
	"value" "bytea"
);
--> statement-breakpoint
CREATE INDEX "messages_crdt_timestamp_index" ON "messages_crdt" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "messages_crdt_dataset_row_column_timestamp_index" ON "messages_crdt" USING btree ("dataset","row","column","timestamp");