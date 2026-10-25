// Seeds (or resets) the installed synthetic showcase: 30 labeled fixture profiles plus a 170-profile
// synthetic crowd (showcase-crowd.sql), in SHOWCASE scope only.
// Run: npm run seed:showcase. Never touches LIVE rows. Availability is re-anchored to tomorrow 15:00 Chicago
// so the composer's default window overlaps it; profiles stay clearly synthetic.
import pg from "pg";
import { readFileSync } from "node:fs";
import { participants, fixtureId } from "../../src/fixtures/scenarios";

try {
  process.loadEnvFile(".env.local");
} catch {}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing server configuration: DATABASE_URL");
const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: true } });
const SHOWCASE = fixtureId(900);
const OPERATOR = fixtureId(901);

const chicagoDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
const anchor = Date.parse(`${chicagoDate}T20:00:00Z`) + 86_400_000;
const fixtureStart = Date.parse("2026-10-25T14:00:00Z");
const shift = (iso: string) => new Date(Date.parse(iso) - fixtureStart + anchor).toISOString().replace(/\.\d{3}Z$/, "Z");

await client.connect();
try {
  await client.query("BEGIN");
  // Reset: synthetic missions and their dependent rows go; LIVE data is untouched.
  await client.query("DELETE FROM missions WHERE scope_mode='SHOWCASE' AND showcase_id=$1", [SHOWCASE]);
  await client.query("DELETE FROM reservations WHERE scope_mode='SHOWCASE' AND showcase_id=$1", [SHOWCASE]);
  for (const [i, p] of participants.entries()) {
    const { id, profileVersion: _v, scope: _s, createdAt: _c, ...profile } = p;
    void _v;
    void _s;
    void _c;
    const shifted = { ...profile, availability: profile.availability.map((a) => ({ ...a, start: shift(a.start), end: shift(a.end) })) };
    await client.query(
      `INSERT INTO participants(id, owner_principal_id, scope_mode, showcase_id, profile, profile_version, discoverable, public_graph, participation_opt_in, created_at)
       VALUES ($1,$2,'SHOWCASE',$3,$4,1,$5,$6,$7, now() + make_interval(secs => $8))
       ON CONFLICT (id) DO UPDATE SET profile=EXCLUDED.profile, discoverable=EXCLUDED.discoverable, public_graph=EXCLUDED.public_graph,
         participation_opt_in=EXCLUDED.participation_opt_in, deleted_at=NULL, purge_by=NULL`,
      [id, OPERATOR, SHOWCASE, JSON.stringify(shifted), profile.visibility.discoverable, profile.visibility.publicGraph, profile.participationOptIn, i],
    );
    await client.query("DELETE FROM capabilities WHERE participant_id=$1", [id]);
    for (const c of profile.capabilities)
      await client.query("INSERT INTO capabilities(id, participant_id, skill_id, level, doc) VALUES (gen_random_uuid(),$1,$2,$3,$4)", [id, c.normalizedSkillId, c.level, JSON.stringify(c)]);
  }
  // 170 more labelled synthetic profiles so the showcase demonstrates matching at scale.
  await client.query(readFileSync(new URL("./showcase-crowd.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log(`showcase ${SHOWCASE}: ${participants.length} fixture + 170 crowd synthetic profiles seeded, availability anchored at ${new Date(anchor).toISOString()}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
