CREATE TABLE "dashboard" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"type" text,
	"width" integer,
	"height" integer,
	"x" integer,
	"y" integer,
	"meta" jsonb,
	"tombstone" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "dashboard_y_x_index" ON "dashboard" USING btree ("y" DESC NULLS LAST,"x" DESC NULLS LAST) WHERE "dashboard"."tombstone" IS FALSE;