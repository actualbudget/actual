CREATE TABLE "messages_crdt" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"timestamp" text,
	"dataset" text,
	"row" varchar(36),
	"column" text,
	"value" "bytea"
);
