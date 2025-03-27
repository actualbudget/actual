CREATE TABLE "schedules_next_date" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"schedule_id" varchar(36),
	"local_next_date" date,
	"local_next_date_ts" bigint,
	"base_next_date" date,
	"base_next_date_ts" bigint,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "schedules_next_date" ADD CONSTRAINT "schedules_next_date_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;