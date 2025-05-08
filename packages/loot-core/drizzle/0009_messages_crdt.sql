CREATE TABLE "actual"."messages_crdt" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" text,
	"dataset" text,
	"row" varchar(36),
	"column" text,
	"value" "bytea"
);
--> statement-breakpoint
CREATE INDEX "messages_crdt_timestamp_index" ON "actual"."messages_crdt" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "messages_crdt_dataset_row_column_timestamp_index" ON "actual"."messages_crdt" USING btree ("dataset","row","column","timestamp");