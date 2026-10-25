-- Synthetic showcase crowd: 170 additional clearly labelled synthetic profiles (SHOWCASE scope only).
-- Deterministic and idempotent (upsert by id). Never touches LIVE rows. Availability is relative to
-- tomorrow 15:00 America/Chicago, matching seed-showcase.ts, so the composer's default window overlaps it.
WITH base AS (
  SELECT (date_trunc('day', now() AT TIME ZONE 'America/Chicago') + interval '1 day 15 hours') AT TIME ZONE 'America/Chicago' AS b
), crowd AS (
  SELECT g,
    ('00000000-0000-4000-8000-' || lpad(to_hex(4096 + g), 12, '0'))::uuid AS id,
    (ARRAY['design','hardware','software','accessibility','research','coordination'])[1 + (g % 6)] AS skill,
    (ARRAY['product','engineering','engineering','product','research','operations'])[1 + (g % 6)] AS category,
    (ARRAY['design','hardware','software','accessibility','research','coordination'])[1 + ((g * 7 + 3) % 6)] AS skill2,
    (ARRAY['product','engineering','engineering','product','research','operations'])[1 + ((g * 7 + 3) % 6)] AS category2,
    (ARRAY['en','es','fr'])[1 + (g % 3)] AS lang,
    (ARRAY['America/Chicago','America/Mexico_City','Europe/Paris','America/New_York','Europe/Madrid','America/Toronto'])[1 + (g % 6)] AS tz,
    (ARRAY['Amara','Diego','Camille','Wei','Lucía','Théo','Priya','Mateo','Inès','Kwame','Sofía','Hugo','Aiko','Valentina','Malik','Chloé','Ravi','Isabela','Yusuf','Élodie','Tomás','Nia','Javier','Léa','Omar','Carmen','Noah','Fatou','Andrés','Margaux'])[1 + (g % 30)] AS first_name,
    chr(65 + (g * 11 % 26)) AS initial,
    2 + (g % 4) AS level,
    (g % 10 <> 0) AS discoverable,
    (g % 13 <> 0) AS opt_in,
    g % 6 AS slot
  FROM generate_series(1, 170) g
), shaped AS (
  SELECT c.*, base.b,
    CASE c.slot
      WHEN 0 THEN jsonb_build_array(jsonb_build_object('s', -6, 'e', -4))
      WHEN 1 THEN jsonb_build_array(jsonb_build_object('s', -4, 'e', 0))
      WHEN 2 THEN jsonb_build_array(jsonb_build_object('s', 0, 'e', 2))
      WHEN 3 THEN jsonb_build_array(jsonb_build_object('s', 1, 'e', 4))
      WHEN 4 THEN jsonb_build_array(jsonb_build_object('s', -6, 'e', 3))
      ELSE jsonb_build_array(jsonb_build_object('s', -5, 'e', -3), jsonb_build_object('s', 3, 'e', 6))
    END AS offsets
  FROM crowd c, base
), profiles AS (
  SELECT s.id, s.discoverable, s.opt_in, s.skill, s.category, s.skill2, s.category2, s.level, s.g,
    jsonb_build_object(
      'displayName', 'Synthetic ' || s.first_name || ' ' || s.initial || '. #' || (30 + s.g),
      'username', NULL,
      'avatarId', '3d_' || (1 + s.g % 5),
      'language', s.lang,
      'needs', jsonb_build_array(s.skill2),
      'interests', CASE WHEN s.g % 2 = 0 THEN jsonb_build_array('accessibility') ELSE jsonb_build_array(s.skill2) END,
      'availability', (
        SELECT jsonb_agg(jsonb_build_object(
          'start', to_char((s.b + make_interval(hours => (o->>'s')::int)) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'end', to_char((s.b + make_interval(hours => (o->>'e')::int)) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'timezone', s.tz))
        FROM jsonb_array_elements(s.offsets) o),
      'capabilities', CASE WHEN s.g % 4 = 0 AND s.skill2 <> s.skill THEN jsonb_build_array(
          jsonb_build_object('normalizedSkillId', s.skill, 'category', s.category, 'level', s.level, 'evidence', NULL, 'confirmedByUser', true, 'normalizationVersion', 'taxonomy-1'),
          jsonb_build_object('normalizedSkillId', s.skill2, 'category', s.category2, 'level', 2, 'evidence', NULL, 'confirmedByUser', true, 'normalizationVersion', 'taxonomy-1'))
        ELSE jsonb_build_array(
          jsonb_build_object('normalizedSkillId', s.skill, 'category', s.category, 'level', s.level, 'evidence', NULL, 'confirmedByUser', true, 'normalizationVersion', 'taxonomy-1')) END,
      'visibility', jsonb_build_object('publicGraph', s.discoverable, 'discoverable', s.discoverable),
      'participationOptIn', s.opt_in
    ) AS profile
  FROM shaped s
), upserted AS (
  INSERT INTO participants(id, owner_principal_id, scope_mode, showcase_id, profile, profile_version, discoverable, public_graph, participation_opt_in, created_at)
  SELECT p.id, '00000000-0000-4000-8000-000000000385', 'SHOWCASE', '00000000-0000-4000-8000-000000000384', p.profile, 1, p.discoverable, p.discoverable, p.opt_in, now() + make_interval(secs => 30 + p.g)
  FROM profiles p
  ON CONFLICT (id) DO UPDATE SET profile = EXCLUDED.profile, discoverable = EXCLUDED.discoverable, public_graph = EXCLUDED.public_graph,
    participation_opt_in = EXCLUDED.participation_opt_in, deleted_at = NULL, purge_by = NULL
  WHERE participants.scope_mode = 'SHOWCASE' AND participants.showcase_id = '00000000-0000-4000-8000-000000000384'
  RETURNING participants.id, participants.profile
), cleared AS (
  DELETE FROM capabilities WHERE participant_id IN (SELECT id FROM upserted) RETURNING participant_id
)
INSERT INTO capabilities(id, participant_id, skill_id, level, doc)
SELECT gen_random_uuid(), u.id, c->>'normalizedSkillId', (c->>'level')::int, c
FROM upserted u, jsonb_array_elements(u.profile->'capabilities') c
WHERE (SELECT count(*) FROM cleared) >= 0;
