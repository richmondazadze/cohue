## Inspiration

Most good ideas die between "someone should build this" and an actual team. Finding people with the right skills, at the same time, who all actually say yes, is slow and awkward, and it gets worse across languages. We wanted a coordinator that does the tedious matching and paperwork while leaving every commitment in human hands.

## What it does

COHUE turns an ambition into a real, agreed team.

- **Describe a mission** in plain language (typed or spoken). COHUE drafts the needed skills, group size and time window; the organizer reviews and confirms every field.
- **Deterministic matching** searches people who opted in and proposes groups that cover every required skill and share enough time. Each proposal explains its coverage, overlap and ranking; "no team found" is reported honestly instead of faked.
- **Explicit consent.** The organizer selects a group and shares a link or QR per person. Each person opens it on their own phone, reads the full terms (role, responsibilities, schedule, who else is on the team) and accepts, declines or suggests another time. A suggestion is never treated as a yes.
- **Repair and reconsent.** If someone declines, COHUE re-plans. If the team changes, everyone must approve the new terms again.
- **Activation and Mission Room.** Only when every member has approved the current terms does the mission activate: memberships, first tasks, and a shared brief.
- **Multilingual.** Invitations and the team brief are machine-translated into each member's language (English, Spanish, French tested), marked "review required" until the organizer approves them, and can be played as speech. The binding original is always shown.
- **Live mission theater.** A network map and activity feed update from committed events, with replay of any past moment.

## How we built it

Next.js 16 and TypeScript as one modular app, with shared Zod contracts for every API call and event. PostgreSQL on Tiger Data holds all state; every command is idempotent and versioned. A durable job worker on a Vultr VM drives planning with leased, fenced jobs, so missions keep progressing with every browser closed. Gemini drafts structured requirements and translations (always validated and reviewed, never trusted for consent or feasibility), ElevenLabs handles speech-to-text and text-to-speech, and SerpApi finds public resources that are shown as unverified evidence, never as team members. The frontend uses React Flow, Motion/GSAP animations driven only by committed events, and full reduced-motion support.

## Challenges we ran into

Keeping consent truly human: changed team composition must invalidate earlier approvals, and two people accepting overlapping missions at the same instant must not double-book anyone. Proving the worker survives crashes: we killed it mid-job on the deployed host and confirmed it recovered, rejected the dead worker's late write, and produced exactly one activation. Translating without letting a model change times or commitments.

## Accomplishments that we're proud of

A real two-phone run on the deployed site: an English organizer, a Spanish-speaking designer and a French-speaking hardware builder formed a team, accepted on their own phones and activated a mission with briefs in all three languages. Automated end-to-end tests cover decline, repair, reconsent, concurrent acceptance and activation against a real database.

## What we learned

Make the "boring" guarantees explicit early (idempotency, versions, scope, consent hashes); they made the AI parts safe to add.

## What's next

More languages after validation, calendar availability import, and richer team rooms.

## Notes for judges

The "synthetic showcase" mode uses 30 clearly labeled synthetic people so the matching can be explored without real participants; it runs the same engine and commands but is not real people or real commitments.

Built with: next.js, react, typescript, postgresql, tiger-data, drizzle, zod, gemini, elevenlabs, serpapi, vultr, vercel, react-flow, gsap, tailwind
