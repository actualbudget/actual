CREATE TABLE "rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"stage" text,
	"conditions" jsonb,
	"actions" jsonb,
	"tombstone" boolean DEFAULT false,
	"conditions_op" text
);
--> statement-breakpoint
CREATE INDEX "rules_stage_index" ON "rules" USING btree ("stage") WHERE "rules"."tombstone" IS FALSE;--> statement-breakpoint
CREATE INDEX "rules_conditions_index" ON "rules" USING gin ("conditions");--> statement-breakpoint
CREATE INDEX "rules_actions_index" ON "rules" USING gin ("actions");