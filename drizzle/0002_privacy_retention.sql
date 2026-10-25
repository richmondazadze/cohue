-- Private, minimal audit. No public operation reads this table; no raw personal text/bearer data.
CREATE TABLE privacy_audit (
  id uuid PRIMARY KEY,
  scope_mode text NOT NULL,
  showcase_id uuid NOT NULL,
  subject_ref uuid NOT NULL,
  source_ref uuid NOT NULL,
  terms_hash text,
  action text NOT NULL,
  occurred_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  CONSTRAINT privacy_audit_source_action UNIQUE(scope_mode,showcase_id,source_ref,action)
);
--> statement-breakpoint
CREATE INDEX privacy_audit_expiry ON privacy_audit(expires_at);
--> statement-breakpoint
ALTER TABLE missions ADD COLUMN event_sequence integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE missions m SET event_sequence=COALESCE((SELECT MAX(sequence) FROM agent_events e WHERE e.mission_id=m.id),0);

--> statement-breakpoint
-- Compatibility bridge: pre-migration writers still allocate MAX(sequence)+1 under the mission lock.
CREATE FUNCTION cohue_sync_event_sequence() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  UPDATE "public"."missions" SET event_sequence=GREATEST(event_sequence,NEW.sequence) WHERE id=NEW.mission_id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER cohue_event_sequence_bridge AFTER INSERT ON agent_events FOR EACH ROW EXECUTE FUNCTION cohue_sync_event_sequence();
