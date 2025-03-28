CREATE TABLE "schedules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"rule" varchar(36),
	"active" boolean DEFAULT false,
	"completed" boolean DEFAULT false,
	"posts_transaction" boolean DEFAULT false,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_rule_rules_id_fk" FOREIGN KEY ("rule") REFERENCES "public"."rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedules_name_index" ON "schedules" USING btree ("name") WHERE "schedules"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "schedules_rule_index" ON "schedules" USING btree ("rule") WHERE "schedules"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "schedules_completed_index" ON "schedules" USING btree ("completed") WHERE "schedules"."tombstone" IS FALSE;