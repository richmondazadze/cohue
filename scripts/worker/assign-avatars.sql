-- One-time backfill: every existing, non-deleted profile without an avatar gets one of the five licensed
-- avatars, chosen deterministically from its id (stable on re-run, spread across 3d_1..3d_5).
-- Idempotent: profiles that already chose an avatar are untouched. Usernames stay as they are.
UPDATE participants
SET profile = jsonb_set(profile, '{avatarId}',
  to_jsonb('3d_' || (1 + (('x' || substr(md5(id::text), 1, 7))::bit(28)::int % 5))))
WHERE deleted_at IS NULL AND profile->>'avatarId' IS NULL;
