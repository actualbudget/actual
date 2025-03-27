CREATE TABLE "category_groups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text,
	"is_income" boolean DEFAULT false,
	"sort_order" bigint,
	"hidden" boolean DEFAULT false,
	"tombstone" boolean DEFAULT false
);
