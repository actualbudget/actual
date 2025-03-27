CREATE TABLE "kv_cache_key" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" text
);
--> statement-breakpoint
CREATE TABLE "kv_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text
);
--> statement-breakpoint
ALTER TABLE "kv_cache_key" ADD CONSTRAINT "kv_cache_key_key_kv_cache_key_fk" FOREIGN KEY ("key") REFERENCES "public"."kv_cache"("key") ON DELETE no action ON UPDATE no action;