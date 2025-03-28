CREATE TABLE "kv_cache_key" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" text
);
--> statement-breakpoint
ALTER TABLE "kv_cache_key" ADD CONSTRAINT "kv_cache_key_key_kv_cache_key_fk" FOREIGN KEY ("key") REFERENCES "public"."kv_cache"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kv_cache_key_key_index" ON "kv_cache_key" USING btree ("key");