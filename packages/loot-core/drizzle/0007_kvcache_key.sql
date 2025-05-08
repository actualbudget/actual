CREATE TABLE "actual"."kvcache_key" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" double precision
);
--> statement-breakpoint
CREATE INDEX "kvcache_key_key_index" ON "actual"."kvcache_key" USING btree ("key");