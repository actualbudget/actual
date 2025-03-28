CREATE TABLE "schedules_json_paths" (
	"schedule_id" varchar(36) PRIMARY KEY NOT NULL,
	"payee" text,
	"account" text,
	"amount" text,
	"date" text
);
--> statement-breakpoint
ALTER TABLE "schedules_json_paths" ADD CONSTRAINT "schedules_json_paths_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;