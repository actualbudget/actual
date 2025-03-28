CREATE TABLE "messages_crdt" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"timestamp" text,
	"dataset" text,
	"row" varchar(36),
	"column" text,
	"value" "bytea"
);
--> statement-breakpoint
CREATE INDEX "messages_crdt_dataset_index" ON "messages_crdt" USING btree ("dataset");--> statement-breakpoint
CREATE INDEX "messages_crdt_row_index" ON "messages_crdt" USING btree ("row");--> statement-breakpoint
CREATE INDEX "messages_crdt_column_index" ON "messages_crdt" USING btree ("column");--> statement-breakpoint
CREATE INDEX "messages_crdt_timestamp_index" ON "messages_crdt" USING btree ("timestamp");