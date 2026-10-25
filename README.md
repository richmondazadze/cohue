# COHUE

### From strangers to something extraordinary.

**COHUE turns a goal into a real team that has actually agreed to do it, across languages.**
Tell it what you want to accomplish. It works out who you need, finds people who have the skills and the time, invites each of them in their own language, and starts the mission only once every person has said yes.

**Try it live:** **https://cohue.tech** · Source: https://github.com/richmondazadze/cohue · Built at HackTX 2026

> *Cohue* is French for a bustling crowd. Any crowd holds people who could build something together. COHUE helps them find each other and actually commit.

---

## The problem

Most good ideas die somewhere between "someone should build this" and an actual team.

A hackathon hall, a campus or a neighborhood is full of people whose skills would fit together, but nobody can see that. Getting from an idea to a working team runs into the same walls every time:

- **You don't know who's out there.** The designer, hardware builder or translator you need could be in the same room, and you'd never find out.
- **Availability is a guessing game.** Finding the right skills isn't enough. Those people also have to be free at the same time.
- **Language gets in the way.** Someone who speaks Spanish or French gets left out because the invitation never made sense to them.
- **"Maybe" isn't a commitment.** Group chats fill up with soft yeses. Someone drops out, and the whole thing quietly falls apart.

The tools that exist each cover one part. AI assistants **give advice**. Directories **list profiles**. Project tools **organize teams that already exist**. Nothing covers the step in between: **turning unconnected people into a team that has agreed to work together.** That's the step COHUE handles.

## What COHUE does

COHUE coordinates the slow, awkward work of forming a team and leaves every real decision to people.

### 1. Describe your mission, typed or spoken
You might say *"I want to run a repair café this Saturday. I need a hardware person and a designer."* COHUE's **Coordinator** talks it through with you in your own language (and can answer out loud), then drafts the skills needed, the group size and the time window. A second AI, the **Strategist**, adds a reality check such as *"15 minutes is unrealistic for a 10-person repair café."* **You review and confirm every field** before anything happens.

### 2. Find a team that actually works
COHUE searches people who **chose to join and to be discoverable**. It proposes groups that **cover every required skill** and **share enough free time**. Each proposal shows its reasoning: who covers which skill, how much the schedules overlap, and why it ranks where it does. When no team is possible, **COHUE says so** instead of making one up.

### 3. Invite people in their own language
The organizer picks a group and shares a **personal link or QR code** with each person. Each person opens it on **their own phone** and sees the full terms: their role, responsibilities, schedule and who else is on the team. The terms are **translated into their language** (English, Spanish or French) and can be **played aloud**. The original wording stays next to the translation, and the organizer approves each translation before it counts as reviewed.

### 4. Only a real "yes" counts
Each person **accepts, declines or suggests another time**. A suggestion is never treated as a yes, and **no AI can accept on anyone's behalf.**

### 5. When someone says no, COHUE re-plans
If someone declines, COHUE **finds a replacement and repairs the plan**. If the team changes, **everyone approves the new version again**, because what you agreed to has changed.

### 6. The mission goes live
Only when **every member has approved the current terms** does the mission activate. At that moment it creates memberships, first tasks and a shared brief. The **Mission Room** then gives the team:
- a task board,
- the team roster with usernames and avatars,
- the brief in each member's language, which can be played aloud,
- an AI-drafted **first-hour kickoff plan** for each role,
- public resources found on the web, **clearly marked unverified** (a search result is never treated as a teammate).

### 7. Watch it happen live, then replay it
While COHUE works, a **live network map**, a board of **agent and tool activity** and an **activity feed** show each step as it's actually saved. Nothing is just for show. You can **replay** any earlier moment, and every animated view also has a plain list version and a reduced-motion mode.

## Who it's for

| Person | What COHUE does for them |
| --- | --- |
| **Organizer** (someone with an idea) | Turns a vague goal into a team that is ready to work, without chasing anyone |
| **Participant** | Gets clear invitations that fit their skills, in their language, and stays in full control of saying yes or no |
| **Community or event host** | Helps people in the same crowd find each other and actually work together |

## Try it yourself (about 3 minutes)

**Option A: Solo, using the synthetic showcase (best for judges)**
1. Open **https://cohue.tech** and choose **Explore the synthetic showcase**. An amber "Showcase · synthetic" badge appears on every page.
2. Choose **Start a mission**, describe a goal (or use the microphone), review the drafted requirements, then choose **Start discovery**.
3. Watch COHUE search a **crowd of 200 clearly labeled synthetic people**, then review the proposed groups.
4. Select a group, send invitations, and see responses, a decline with repair, and activation.
5. Open the **Mission Room**: tasks, the brief in English/Spanish/French, the kickoff plan and Listen. Then try **Replay**.

Showcase people are synthetic, and their responses are labeled operator decisions. The matching, consent rules, repair and activation are the same real engine that runs live missions.

**Option B: Real people, real phones**
Each person opens cohue.tech on their phone and chooses **Join the network**. They pick a language, skills, availability, a username and an avatar. The organizer starts a mission, and each invitee scans their QR code and responds on their own phone. The step-by-step script is in [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md).

## What makes it different

- **Consent comes first.** Nobody gets added to a team without accepting it on their own device. If the team changes, everyone agrees again.
- **AI helps, people decide.** AI drafts requirements, translations, strategy notes and kickoff plans. It never decides who is on a team, whether a schedule works, or whether someone agreed. Fixed, checkable code makes those decisions.
- **Honest by design.** "No team found" is a real answer. Large searches say "best found, not proven optimal". Web results are labeled unverified. Synthetic data is always labeled. Translations are marked "review required" until a person approves them.
- **It keeps working when everyone closes their browser.** A background worker on a dedicated server keeps missions moving, and it was tested by deliberately crashing it mid-task (details below).
- **Multilingual from the start.** It speaks and translates in English, Spanish and French, and the binding original is always shown.
- **Privacy built in.** Deleting your profile revokes access immediately, and your personal details are scrubbed within 24 hours. Raw voice recordings are never stored. Generated audio expires within 24 hours.

## Proof that it works

We tested the system live, not just with mock-ups:

- **A real two-phone run on the live site.** An English-speaking organizer, a Spanish-speaking designer and a French-speaking hardware builder formed a team. Each accepted on their own phone, and the mission activated with briefs in all three languages.
- **The crash test.** On the production server, we killed the background worker in the middle of a job, with every browser closed. It restarted on its own and picked up the unfinished job. The crashed worker's late write was rejected, and exactly one activation happened. See [docs/operations/D7_EVIDENCE.md](docs/operations/D7_EVIDENCE.md). (This test was run on an earlier worker version and hasn't been repeated on the latest release.)
- **Matching at scale.** On the 200-person showcase, a 3-person mission checked **4,372 possible team combinations in 14 ms** and returned 5 valid proposals.
- **Automated tests** cover declines, repair, re-approval, two people accepting at the same instant without being double-booked, and activation. They run against a real database in CI (GitHub Actions) on every push.

## Full tech stack

| Area | What we used | What it does in COHUE |
| --- | --- | --- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | One web app covering every screen, tuned for phones first |
| **Styling and UI** | Tailwind CSS 4, Radix UI | Accessible components following the COHUE design system |
| **Graph and visuals** | React Flow, ELK.js | Live network map of people, skills and missions |
| **Motion** | Motion, GSAP | Animations triggered only by real, saved events, with full reduced-motion support |
| **Client state** | TanStack Query, Zustand | Live data, updates and local UI state |
| **Shared contracts** | Zod | One validated schema for every API call and event, shared by frontend and backend |
| **Backend** | Next.js API routes (Node.js 24) | Authenticated commands for missions, invitations, consent and activation |
| **Database** | PostgreSQL on **Tiger Data**, Drizzle ORM | All state; every action is versioned and safe to retry |
| **Background worker** | Custom leased job runner on a **Vultr** VM (systemd) | Keeps missions moving without a browser and recovers from crashes |
| **Matching engine** | Custom deterministic constraint search | Covers every skill, checks schedule overlap and team capacity, and explains its ranking |
| **AI: drafting and translation** | **Google Gemini** (gemini-3.1-flash-lite) | Turns plain language into structured requirements and profiles, and translates invitations and briefs |
| **AI: strategist and fallback** | **Meta Model API** (Muse Spark) | Second-opinion strategy notes, and takes over drafting when Gemini is slow |
| **Voice** | **ElevenLabs** (Scribe speech-to-text, Multilingual v2 text-to-speech) | Speak your mission or profile, hear the Coordinator, listen to translated invitations and briefs |
| **Web discovery** | **SerpApi** | Finds public resources for a mission, always labeled unverified |
| **Hosting** | **Vercel** (web), Vultr (worker), Tiger Data (database), domain cohue.tech | Production deployment |
| **Testing and CI** | Vitest, Playwright, GitHub Actions with PostgreSQL 17 | Unit, contract, database and full browser-journey tests |
| **Design** | COHUE Design System (Open Circle mark, Switzer and Space Grotesk type), 3D avatars from alohe/avatars (MIT) | One consistent visual identity |

## Challenges we worked through

- **Keeping consent genuinely human.** Changing the team cancels earlier approvals, and two people accepting overlapping missions at the same instant must never double-book anyone.
- **Making the worker survive crashes.** We added leases and "fencing" so a crashed worker can never overwrite the work of the worker that replaced it.
- **Translating without changing the deal.** A model must never quietly change a time or a responsibility. That's why translations are checked, reviewed and always shown next to the original.
- **Keeping AI fast enough for a live demo.** When Gemini is slow, COHUE starts Meta in parallel after 6 seconds and uses whichever answer arrives first.

## What's next

More languages after validation, importing availability from calendars, richer Mission Rooms, and repeating the crash test on the latest worker release.

## For developers

```bash
# Node 24 + npm; PostgreSQL 17 for database features
npm ci --ignore-scripts
cp .env.example .env.local     # add your own values; never commit them
npm run db:migrate             # set up the database
npm run seed:showcase          # optional: synthetic showcase crowd
npm run dev                    # http://localhost:3000
npm run worker                 # in a second terminal: background worker
npm run check                  # lint, types, tests, production build
```

AI and voice keys are optional locally. Without them, those features say they're unavailable instead of faking results. Code map: `src/app` (pages and API), `src/features` and `src/components` (UI), `src/server` (domain, matching, worker, providers), `src/contracts` (shared schemas), `drizzle/` (migrations), `tests/`.
More detail: [Deployment](docs/operations/DEPLOYMENT.md) · [API keys](docs/operations/API_KEYS.md) · [Contracts](docs/CONTRACTS.md) · [Privacy and retention](docs/operations/PRIVACY_RETENTION.md) · [Design system](docs/design/DESIGN_SYSTEM_V1.0.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)

## AI tools disclosure

Claude Code and Codex assisted with implementation, debugging, documentation and testing. Real people made the actual mission and consent decisions in the recorded live run. Responses in the synthetic showcase are explicitly labeled operator decisions.
