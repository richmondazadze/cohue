CREATE TABLE "access_epochs" (
	"principal_id" uuid PRIMARY KEY NOT NULL,
	"epoch" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"agent" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"result_ref" uuid
);
--> statement-breakpoint
CREATE TABLE "audio_artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_principal_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"status" text NOT NULL,
	"mime_type" text,
	"bytes_base64" text,
	"doc" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"constraints_version" integer NOT NULL,
	"doc" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participant_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"level" integer,
	"doc" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"principal_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_digest" text NOT NULL,
	"http_status" integer NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"type" text NOT NULL,
	"doc" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"proposal_id" uuid NOT NULL,
	"proposal_revision" integer NOT NULL,
	"participant_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"language" text NOT NULL,
	"status" text NOT NULL,
	"terms" jsonb NOT NULL,
	"terms_hash" text NOT NULL,
	"response_version" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"lineage" jsonb,
	"link_epoch" integer NOT NULL,
	"token_hash" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"agent" text NOT NULL,
	"checkpoint" jsonb NOT NULL,
	"input_version" integer NOT NULL,
	"status" text NOT NULL,
	"lease_owner" uuid,
	"lease_expires_at" timestamp with time zone,
	"fence" bigint NOT NULL,
	"attempts" integer NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"dedupe_key" text NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "localizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"doc" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"doc" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"doc" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"owner_principal_id" uuid NOT NULL,
	"state" text NOT NULL,
	"version" integer NOT NULL,
	"constraints_version" integer NOT NULL,
	"doc" jsonb NOT NULL,
	"current_proposal_revision" integer,
	"selected_proposal_id" uuid,
	"excluded_participant_ids" jsonb NOT NULL,
	"counter_availability" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_opportunities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"doc" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"invitation_id" uuid,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_principal_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"profile" jsonb NOT NULL,
	"profile_version" integer NOT NULL,
	"discoverable" boolean NOT NULL,
	"public_graph" boolean NOT NULL,
	"participation_opt_in" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"purge_by" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "group_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"rank" integer NOT NULL,
	"doc" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_requirements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"version" integer NOT NULL,
	"doc" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participant_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"state" text NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "participant_responses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"invitation_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"doc" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"status" text NOT NULL,
	"version" integer NOT NULL,
	"doc" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"kind" text NOT NULL,
	"principal_id" uuid NOT NULL,
	"scope_mode" text NOT NULL,
	"showcase_id" uuid NOT NULL,
	"invitation_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mission_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"owner_membership_id" uuid NOT NULL,
	"status" text NOT NULL,
	"version" integer NOT NULL,
	"doc" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_matches" ADD CONSTRAINT "candidate_matches_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_proposal_id_group_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."group_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_memberships" ADD CONSTRAINT "mission_memberships_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_creator_id_participants_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_opportunities" ADD CONSTRAINT "external_opportunities_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_proposals" ADD CONSTRAINT "group_proposals_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_requirements" ADD CONSTRAINT "mission_requirements_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_responses" ADD CONSTRAINT "participant_responses_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_tasks" ADD CONSTRAINT "mission_tasks_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_tasks" ADD CONSTRAINT "mission_tasks_owner_membership_id_mission_memberships_id_fk" FOREIGN KEY ("owner_membership_id") REFERENCES "public"."mission_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidates_mission" ON "candidate_matches" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "capabilities_skill" ON "capabilities" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_key" ON "command_receipts" USING btree ("scope_mode","showcase_id","principal_id","operation","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "events_mission_sequence" ON "agent_events" USING btree ("mission_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_proposal_participant" ON "invitations" USING btree ("proposal_id","participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "invitations_participant" ON "invitations" USING btree ("participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_dedupe" ON "jobs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "jobs_ready" ON "jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "match_results_revision" ON "match_results" USING btree ("mission_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_unique" ON "mission_memberships" USING btree ("mission_id","participant_id");--> statement-breakpoint
CREATE INDEX "missions_scope_state" ON "missions" USING btree ("scope_mode","showcase_id","state");--> statement-breakpoint
CREATE INDEX "participants_scope" ON "participants" USING btree ("scope_mode","showcase_id");--> statement-breakpoint
CREATE INDEX "participants_owner" ON "participants" USING btree ("owner_principal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_revision_rank" ON "group_proposals" USING btree ("mission_id","revision","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "requirements_position" ON "mission_requirements" USING btree ("mission_id","position");--> statement-breakpoint
CREATE INDEX "reservations_participant" ON "reservations" USING btree ("participant_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash" ON "sessions" USING btree ("token_hash");