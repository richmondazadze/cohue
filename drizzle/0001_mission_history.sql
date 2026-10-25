CREATE TABLE "mission_history" (
	"mission_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"state" text NOT NULL,
	"current_proposal_revision" integer,
	"selected_proposal_id" uuid,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mission_history" ADD CONSTRAINT "mission_history_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mission_history_version" ON "mission_history" USING btree ("mission_id","version");