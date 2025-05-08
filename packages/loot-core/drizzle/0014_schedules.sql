CREATE TABLE "actual"."schedules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"rule" varchar(36),
	"active" boolean DEFAULT false,
	"completed" boolean DEFAULT false,
	"posts_transaction" boolean DEFAULT false,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "actual"."schedules" ADD CONSTRAINT "schedules_rule_rules_id_fk" FOREIGN KEY ("rule") REFERENCES "actual"."rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedules_name_index" ON "actual"."schedules" USING btree ("name") WHERE "actual"."schedules"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "schedules_rule_index" ON "actual"."schedules" USING btree ("rule") WHERE "actual"."schedules"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "schedules_completed_index" ON "actual"."schedules" USING btree ("completed") WHERE "actual"."schedules"."tombstone" IS FALSE;