-- Existing profiles remain valid without claiming a username or a chosen avatar.
UPDATE participants SET profile = jsonb_build_object('username',NULL,'avatarId',NULL) || profile
WHERE NOT profile ? 'username' OR NOT profile ? 'avatarId';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS participants_scoped_username
ON participants (scope_mode,showcase_id,lower(profile->>'username'))
WHERE deleted_at IS NULL AND profile->>'username' IS NOT NULL;
