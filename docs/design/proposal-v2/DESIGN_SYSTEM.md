# COHUE frontend design system v2 — Common ground, in the light

24 October 2026. Status: **proposed, awaiting explicit user approval**. Design exploration authorized by the pasted Frontend Engineer Initialization request. Full application implementation remains on hold. This specification and `index.html` are isolated planning artifacts, not production pages, working providers, an authenticated app or backend integration. Every illustrated person, event and metric is synthetic. Static samples illustrate states; they do not demonstrate matching, consent or durable execution.

Sources: complete 21-section Master Plan v1.0 (adjacent reference extraction), AGENTS.md, both synchronized handoffs, ENGINEERING_READINESS, approved CONTRACTS v0.1 and WORKSTREAMS. D1–D12 supersede historical PRD ambiguities. No contracts changed, no backend code, no specialist agents activated. The current chat acts as the frontend designer. The proposal retains all seven experiences, eight event-bound motions and the English/Spanish/French final requirement.

## 1. Product identity and creative premise

COHUE makes hidden human possibility legible, then turns it into an explicit agreement. Its experiential arc is **ambition → possibility → consent → shared action**. The interface must convey intelligence while leaving human decisions unmistakably human. The graph is an explanation of relationships and constraints; the event trace is evidence of work; the Mission Room is the practical outcome. A successful theater moment ends with understandable next steps, not merely a dramatic network.

Direction: **Common ground, in the light**. The user supplied two direct visual references: Jeremy Blaze / Never Before Seen's light automation canvas and Base44's warm app-entry surface from Mobbin. Adopt their broad principles of whitespace, clear intent, light surfaces, thin structural lines and focused inspection. COHUE's UI is authored independently: no screenshot assets, brand marks, code or exact layouts from those references ship in the board. User reference paths are recorded in SOURCES.md.

All seven experiences now use light surfaces. Warm neutral context surrounds white reading panels and a near-white graph. Blue identifies action/selection; green confirms consent; ochre indicates waiting; clay marks decline/error. The mission remains spatially anchored without making its background dark. Headings and body use one crisp sans-serif family. This supersedes v1's ink Theater, citron action and serif display direction. D1–D12 and all consent/privacy/motion semantics are unchanged.

## 2. Exact color tokens

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| App context | canvas | #F5F3EF | Warm neutral page background |
| Reading/control surface | surface | #FFFFFF | Panels, forms, node bodies |
| Graph canvas | canvas-graph | #FCFCFA | Spatial background |
| Quiet inset | surface-subtle | #F7F8F6 | Section/field grouping |
| Hover fill | surface-hover | #EAEDE8 | Neutral hover |
| Main text | text-primary | #202323 | Titles, body, labels |
| Secondary text | text-secondary | #626662 | Metadata and helper text |
| Quiet divider | line-subtle | #E2E5DF | Decorative separation only |
| Panel frame | line-panel | #D5D9D1 | Decorative grouping, not sole control boundary |
| Informative control boundary | line-control | #7B847C | Inputs, buttons and graph links when informative |
| Graph grid | grid-dot | #DEDFD8 | Nonsemantic dot field |
| Main action / focus | action | #315CCE | White-labeled filled button; focus and selected node outline |
| Action hover | action-hover | #254DAF | Primary pointer hover |
| Action pressed | action-pressed | #1E408F | Primary pressed fill |
| Selected surface | selected-bg | #EDF2FF | Active node/pane, blue text/icon |
| Approval | approved / approved-bg | #216747 / #E6F2E9 | Check plus accepted terms |
| Waiting | pending / pending-bg | #785317 / #FFF2D6 | Clock plus pending/counter |
| Decline/error | declined / declined-bg | #A13F36 / #FBE4DE | Minus / warning with precise copy |
| Public evidence | evidence / evidence-bg | #466A84 / #EDF3F7 | Square tile, source and unverified label |
| Suggested | suggested | #626662 | Dashed edge plus Suggested text |
| Activated | activated / activated-bg | #216747 / #E6F2E9 | Mission double frame plus Activated heading |
| Modal backdrop | overlay | rgba(32,35,35,.32) | Modal reading separation |
| Media control dark | media-ink / on-media-ink | #202323 / #FFFFFF | Optional compact playback/record control only |

No additional semantic dark-mode palette is proposed in v2. “Approved” remains a participant commitment, “Activated” a server-committed mission with memberships/tasks; same hue does not collapse these meanings. Suggested/pending edges dashed with different labels; approved solid/check; declined broken/minus; evidence dotted/square. Constraint exclusion uses barred endpoint and exact reason. Disabled labels remain readable and include the reason beside the action. No opacity-only disabling of critical terms.

Contrast gate: ≥4.5:1 ordinary text, ≥3:1 large text/informative graphics/focus. Quiet dividers and graph dots are decorative, not interactive boundaries. White on action blue; primary ink never appears on a blue fill. Contrast verification is recorded separately; production audit remains required.

## 3. Typography, spatial system and brand mechanics

**Space Grotesk variable 400–700** is the sole UI/display font in v2. The actual locally retained font is SIL OFL 1.1, original notices/immutable commit/hashes at ../proposal-v1/fonts/sources.json. Retain accents and English/Spanish/French coverage. System sans fallback for unavailable/other scripts. Newsreader is preserved in v1 historical assets but not proposed for v2. No external font requests. Optimize to licensed WOFF2 at authorized product installation; TTF is a local design specimen only.

| Style | Desktop size/line | Phone size/line | Weight / tracking |
| --- | --- | --- | --- |
| Entry heading | 64/68 (board scales to 72) | 40–48/44–50 | 500 / -.05em |
| Experience headline | 38/44 | 30–32/36 | 500 / -.04em |
| Section title | 24/30 | 22/28 | 500 / -.025em |
| Panel title | 18/26 | 18/26 | 600 / -.015em |
| Body and inputs | 16/24 | 16/24 | 400 / normal |
| Compact UI | 14/20 | 14/20 | 500 / normal |
| Metadata | 12/18 | 12/18 | 400–500 / normal |

Use a single strong heading per view; uppercase overlines limited to 12/18 at .08em tracking. Paragraphs ≤65ch; consent column 48–60ch. Tabular figures for counts/time. All translated labels wrap; consent terms never truncate.

4px spacing base; scale 4/8/12/16/20/24/32/40/48/64/80/96. Gutters 16 phone, 24 tablet, 32 desktop, 48 large desktop. Content max 1600px; reading column max 680px. 4/8/12-column structure. Controls ≥44px, main actions/record 48–56px, 8px target gap. Form padding 12px 14px. Radii 6 compact/8 field/10 button/16 panel/24 sheet; full rounding reserved for avatar/status. Informative borders 1px; selected node 2px action outline; focus 2px action with 3px offset, distinct from permanent selection. Shadow only on an elevated sheet or lightly floating canvas tools (`0 12px 32px rgba(32,35,35,.08)`); no animated blur or glass. Fine rules and whitespace replace nested card stacks.

Layers: canvas 0, graph controls 10, navigation 20, sheet 40, modal 60, nonessential toast 80. Modal critical actions remain unobstructed. Header contains neutral COHUE name label pending logo selection. Proposed logo clear space/minimum sizes remain a final-kit task after selection. Do not distribute a concept as the final trademark-cleared brand.

## 4. Component treatment and states

Primary button: blue with white label, 48px tall, 500 weight; one dominant primary action per decision region. Secondary: transparent with informative outline. Destructive/decline: explicit verb, clay text/outline, no alarming filled red for a normal participant choice. Tertiary: underlined text or simple icon plus label. Pending commands retain the verb as “Saving response…” and prevent duplicate submits without replacing existing terms. Success appears only after authoritative acknowledgement. Disabled controls include nearby reason; do not rely on an inaccessible tooltip.

Inputs have permanent labels, helper text, visible invalid outline and inline explanation linked by aria-describedby. Select controls preserve current value during refetch. Chips are removable only with labeled 44px hit regions. Scheduling uses explicit local timezone, date, start/end and confirmed common overlap; no invented “anytime” default. Checkboxes for participation and public visibility are separate, initially unasserted where explicit consent is required.

Panels use section rules and whitespace. Candidate row: identity, relevant capability, coverage evidence, availability and invitation status; no inferred personality/compatibility percentage. StatusBadge includes icon and label. EventRow includes role, actual action, timestamp, outcome and expandable redacted evidence; never expose chain-of-thought or private tool arguments. Agent badges are small labeled typographic markers (D/Sc/St/C), not four animated characters.

Dialogs use Radix focus containment, title, description, Escape and focus restoration. Consent is a reading page; counterproposal is an accessible sheet/dialog with explicit submit and cancel. Phone sheets have a visible close button and internal scroll; drag dismissal is optional, never required. Tabs retain focus and use arrow-key semantics. Toasts are nonessential acknowledgements with inline durable equivalents, never the only evidence of acceptance. Tooltips show after 400ms initially, immediately between adjacent controls, keyboard accessible. All icon-only controls have visible tooltip and accessible name. Use CSS borders and simple geometric node shapes; no extra icon library requested for v2.

## 5. Seven experiences, desktop and phone

| Experience | Information hierarchy / desktop | Deliberate phone / tablet strategy | Key interactions and states |
| --- | --- | --- | --- |
| 01 Entry | Editorial proposition “From strangers to something extraordinary.” Start / Join beside a permitted network excerpt; explain Discover, Coordinate, Make below. Clear Live / Showcase label. | Proposition then actions, compact safe network excerpt below; no background graph behind copy. Tablet two columns only if both remain readable. | Start opens composer; Join opens onboarding/invite entry. No public opted-in profiles: honest empty illustration labeled conceptual, no fake live count. |
| 02 Onboarding | 680px form, adjacent review of offered skills/needs, language, availability, interests and separate consent choices. Voice/text feed same editable summary. | One-column steps: About you → Skills & needs → Time & visibility → Review. Sticky next action stays above safe area and keyboard. | Manual edit, validation, microphone denial, saving, retained draft, visibility edit/opt-out. Session access failure gives scoped recovery; no promise of cross-device draft sync. |
| 03 Composer | Large intention field and microphone; reviewed objective above requirement rows. Timing, minimum common overlap, team-size bounds, creator participation, expected output and unknowns in adjacent inspector. | Intention → editable transcript → requirements → constraints → final summary. Collapsible preview, not a miniature theater. At 768px use side review where space permits. | Record/transcribe/extract are distinct. Highlight unknowns; “Review requirements” precedes “Start discovery”. Request acknowledgement starts pending execution, not completion. |
| 04 Theater | 64px header with mission/state/mode. 240–280px requirement rail, flexible graph, 300–340px activity/inspector at ≥1440; at 1024 select Activity or Inspector in one right pane. Footer shows proposal revision, coverage and approvals separately. | 320–389 defaults to Mission summary + People list; Graph toggle optional. 390–479 compact focused network plus tabs Mission / People / Activity. Selection opens detail sheet. Tablet graph with one collapsible pane. No four simultaneous rails. | Inspect candidates and provenance, compare feasible configurations, select proposal, share ready link/QR. “Activation pending” until server event. Reconnecting preserves last verified timestamp. |
| 05 Invitation | Calm light reading surface: intended recipient, localized objective, offered role, responsibilities, disclosed group terms, exact local time/timezone, expiry and source-language switch. Actions after full terms. | Single reading column, 16px text, sticky Accept / Other response opens Decline / Suggest a change; all options reachable without gestures. Expanded action area never covers last paragraph. | Preview → explicit “Open my invitation” redemption → scoped terms → explicit response. Explain link grants access to this invitation, not identity verification. Accept submits current terms hash; counter never accepts. Changed terms shows comparison and renewed consent. |
| 06 Mission Room | “Activated” header; approved roster beside next actions, shared multilingual brief, task ownership and resources. Small network persists as context. | Tasks first, tabs Brief / Team / Resources, no graph needed to complete actions. Tablet team beside tasks. | Task statuses persist server-side; stale edits reconcile visibly. Schedule/withdrawal requests show “Review requested”, never automatic dissolution. No room on a merely accepted invitation. |
| 07 Impact & Replay | Verifiable outcomes: approved members, required coverage, actual recovery events, assigned tasks; source/provenance drawer. Read-only replay scrubber and event list. | Vertical evidence story with step previous/next; compact replay viewport optional. Tablet split timeline/graph. | Replay mode labeled persistently, separate historical snapshot/time. No live commands or invented “people impacted” metric. Missing history says unavailable; advanced playback is Tier 3, basic evidence remains. |

Responsive breakpoints follow PRD bands, not device marketing names: 320–389, 390–479, 480–1023, 1024–1439, ≥1440. At 480–767 use phone composition with wider gutters; 768–1023 may open two panes when content fits. Rotation preserves selection and task/transcript edits. 200% zoom and 400% text reflow must produce a usable reading/list mode. No mandatory horizontal page scroll.

## 6. Living network and Mission Theater composition

Mission is a a blue-outlined pale-blue rounded rectangle; requirements are smaller labeled rectangles; participants are circular initial/avatar anchors with adjacent readable labels; public opportunities are square outlined evidence tiles in a separate resource lane. Identity geometry survives monochrome. Person focus detail includes authorized capability evidence; no private biography rendered then hidden with CSS. Graph labels ≥14px at readable zoom; dense views collapse authorized groups and expose counts with list access rather than reducing text to dust.

Arrange mission center-left, human requirements/candidates across the middle/right, resource lane below. ELK computes a stable constraint-oriented arrangement, not a free-running force simulation. Preserve node IDs and existing positions; pin user selection; fit only on first load or explicit Fit. No camera flight on every event. Candidate hover highlights only adjacent relevant relationships. Mouse pan/zoom and keyboard controls coexist; one-finger page scrolling remains reliable on phone, explicit graph interaction mode permits canvas gestures. Provide Zoom in/out, Fit, Reset and a fully equivalent People/Requirements list. Never let graph gestures trap navigation.

Suggested edge: neutral dashed + “Suggested”; pending: ochre dashed + clock; accepted commitment: green solid + check; declined: clay broken + minus; excluded: barred endpoint + reason; activated: mission double outline with explicit label. All statuses exist in the list. A replacement appears as Suggested until a persisted replacement invitation exists, then Pending, then Approved only after a real response. External evidence stays dotted blue and has source, retrieved time and “Public resource · Unverified”; it never uses participant approval geometry.

Theater has three questions in reading order: What is the mission? What is missing/agreed? What happened and why? Requirement coverage and human approvals are separate counters. “Requirements covered 3/3 · Approvals 2/3” cannot become “Ready” based solely on coverage. Strategy comparison shows hard constraints, overlap and rationale, never speculative consent scores. Event inspector shows structured reasons and evidence, not private model reasoning. Activity is a chronological audit, with newest activity accessible without stealing reading position.

## 7. Cinematic motion, bounded by truth

Motion supports cause and effect. It does not delay action or imply autonomous work. CSS handles small hover/press/focus transitions; Motion handles interruptible panel/selection transitions; React Flow owns node positions and camera; ELK owns computed target layout. Never have Motion and React Flow both write the same node transform. No GSAP, Pixi or Three.js addition.

Tokens: instant 0ms; press 80ms (scale .98, pointer interaction only); feedback 120ms; routine enter 180ms; routine exit 120ms; sheet 240ms; graph rearrangement 320ms; activation emphasis 480ms maximum, once per committed activation event. Standard ease `cubic-bezier(.2,.8,.2,1)`; exit `cubic-bezier(.4,0,1,1)`; gesture spring stiffness 420, damping 38, mass 1, tuned on device with no visible bounce. Stagger 24ms, total capped 120ms; never disable interaction during stagger. No repetitive motion on keyboard selection.

| PRD motion | Real trigger / proposed mapping | Reduced motion |
| --- | --- | --- |
| Network emergence | Authorized validated profile/graph projection arrives: 180ms opacity + up to 6px entrance; relation only if projected edge exists. | Immediate node/list insertion with batched polite announcement. |
| Mission formation | Confirmed requirement snapshot/REQUIREMENT_CONFIRMED: editable rows resolve into stable requirement nodes, 240ms local crossfade. | Immediate update, “Requirements confirmed”. |
| Agent execution | AGENT/TOOL_STARTED then COMPLETED/FAILED events: highlighted event row, 180ms emphasis; waiting label only while actual step open. | Static running icon/text. No pulse. |
| Discovery | CANDIDATES_FOUND or scoped opportunity snapshot: candidate entrance and distinct resource lane, max 120ms stagger. | Immediate groups and count announcement. |
| Invitation ready | Persisted INVITATION_SENT: pending edge crossfade 180ms, “Invitation ready”; no traveling envelope implies delivery. | Immediate pending label. |
| Decline / repair | INVITATION_DECLINED → REPLAN_STARTED → new proposal: broken old edge, expose missing requirement, 320ms stable rearrangement after new layout. Preserve valid consent only as projected. | Each verified phase updates immediately; text explains missing skill/replacement pending. |
| Activation | MISSION_ACTIVATED with membership/tasks: single 480ms double-outline emphasis then crossfade to Room affordance. No forced navigation or confetti. | Immediate Activated heading and Open room action. |
| Multilingual voice | Local microphone samples reflect actual input; persisted transcript/generation states distinct; playback progress follows media currentTime. | Static “Recording” indicator plus elapsed time, transcript and controls; waveform omitted. |

Projection pipeline: Zod-validated snapshot + snapshotSequence → authorized ordered events → dedupe by sequence → projection → semantic transition queue. A newer authoritative snapshot wins over old animation; drop stale layout results using a generation counter. Sequence gaps trigger refetch; do not play an incomplete story. Reconnect hydrates newest state without replaying a backlog as fresh work. Replay uses its own immutable projection and event clock; pause, speed and seek never issue commands. Under burst load coalesce layout updates and summarize events without dropping audit records. On tab return show current state; no accumulated animation queue. Dispose animations/layout jobs on unmount, permission changes and cancellation.

Reduced motion removes camera movement, transform entrances, edge travel, waveform motion, staggers and activation flourish; retain immediate state changes or optional ≤100ms opacity. Visible controls also permit pausing nonessential motion. No flashing. Never gate application state, focus or command completion on animation callbacks.

## 8. Voice and multilingual negotiation

Idle: labeled Record control with Type instead. Request permission only on activation. Recording: explicit Stop and Discard, elapsed duration and bounded upload limit supplied by validated configuration (not an invented supported duration). Stop → Uploading → Transcribing → Editable transcript → Extracting → Review structured intent → explicit action. User may correct and retry without losing text. Permission denial, unsupported format, noisy/empty audio, interrupted upload and provider failure each offer typed entry. No waveform animates before permission or after stop.

Output: language selector with English/Español/Français names; localized text is primary, source text available nearby. Listen is explicit; never autoplay. Show loading, playing, paused, ended, failed and expired audio states, rate and elapsed/duration. Changing language stops playback and requests the correct canonical version. Audio is supplementary; every action works without it. Translation mismatch offers “View original / Suggest a change”, never silently changes commitments. Final accept button is explicit in the participant's selected language. Show canonical terms revision; a language switch does not mutate terms or approval. Raw audio deletion/24h synthesized TTL follows D10; no false promise of persistent audio in replay. Post-response receipt repeats accepted/declined/counterproposed with timestamp and terms summary.

## 9. Failure and lifecycle design

| State | Visual and recovery treatment |
| --- | --- |
| Initial loading | Static skeleton of known layout, aria-busy on region; no fabricated node counts or percentage; no shimmering default. |
| Empty | Purpose-specific copy and concrete next action: Add availability, Add requirements, or Join network. Public empty graph never invents people. |
| Draft / invalid | Neutral draft label; field-level errors and focused error summary; preserve input. |
| Planning / discovering | Current verified step plus event trace; indeterminate state, no elapsed-time completion estimate. |
| Proposed / reproposed | Neutral dashed proposal, revision and feasibility summary; “Review proposal”, never “Your team”. |
| Awaiting approval | Amber clock, exact pending vs approved counts, invitation-ready/share controls. |
| Replanning | Amber mission label and uncovered capability; valid accepted people remain green when server permits; no automatic acceptance of replacement. |
| Paused for human | Persistent ochre callout with precise missing input and creator correction action. SEARCH_LIMIT_REACHED differs from proven NO_SOLUTION. |
| Declined / counterproposed | Person-level clay minus / ochre change marker; counter terms shown for review, never a checkmark. |
| Activated | Double-ring mission + Activated; actual members/tasks only. |
| Failed / provider degraded | Coral warning, safe explanation and correlation reference; retry if retryable, type/text fallback when relevant. No vendor stack traces. |
| Cancelled / expired | Neutral closed state, timestamp, copy explaining what can be restarted; expired invite cannot submit. |
| Offline / reconnecting | Persistent banner with last verified time; stale graph remains labeled, mutation actions unavailable until a safe retry. Do not queue consent offline. Draft text may remain locally in memory, not a promised durable sync. |
| Stale revision 409 | Preserve edits; fetch current terms, show changed sections, request renewed review; never auto-resubmit consent. |
| Access denied / removed | Opaque access message, clear scoped graph/cache and stop stream/media; no unauthorized preview flash. |

## 10. Accessibility and performance acceptance

Target WCAG 2.2 AA. Every graph action has a semantic list equivalent; use built-in React Flow keyboard facilities with localized ariaLabelConfig, then verify them in the actual product. Status changes use batched polite live text, errors assertive only when urgent. Restore focus to initiating control after dialogs; after route change focus the page heading. Preserve focus on selected nodes through layout. Include skip links, semantic headings, lang attributes and localized dates/timezones. No drag-only or hover-only task. All consent copy remains available at 200% text size and 320px CSS width. Test keyboard-only, VoiceOver, Android TalkBack where available, reduced motion, contrast and touch. Actual device evidence is required; none is implied by this proposal.

Proposed measurable budgets: production p75 LCP ≤2.5s, INP ≤200ms, CLS ≤.1 on representative deployed mobile conditions; these are targets, not results. Load graph/layout only on relevant experiences; defer replay and TTS until needed. Self-host optimized WOFF2/font-display swap in production, preload at most the primary Latin UI face; reserved line boxes prevent shifts. Stable memoized node/edge components and callbacks, narrow Zustand selectors, no whole-graph subscription for a selected-name label. Keep React renders out of media sample/frame loops. No animated blur/backdrop filter or perpetual edge dashes. Animate transforms/opacity where feasible; SVG path changes and React Flow layout require profiling and cannot be promised compositor-only.

Start with 30 synthetic profiles; default phone focus view ≤8 visible nodes, expand through lists/selection; desktop overview can show all 30 with clutter controls. These are display budgets, never hidden matching limits or scope reductions. Profile 30 nodes/60 edges with rapid events and phone interaction, target median near 60fps on capable reference hardware, no sustained main-thread layout freeze. Use worker-based ELK if measurements justify it; do not run layout per pointer move. Canvas is optional, the semantic task flow is always available. Run meaningful behavior tests, not tests mirroring CSS values.

## 11. Frontend component architecture and integration

Planned only. Frontend owns page/layout/loading/error UI under src/app (not route.ts APIs), src/components, src/features client code, src/client, public assets and UI tests. Lead owns shared schemas and root dependencies. Backend owns auth/commands/providers/DB. No duplicate state unions or ad hoc response types.

| Boundary | Components / responsibility |
| --- | --- |
| components/ui | Button, Field, StatusBadge, Tabs, Dialog, Sheet, Notice, Skeleton; approved visual roles on Radix primitives |
| components/network | MissionNode, RequirementNode, ParticipantNode, OpportunityNode, CommitmentEdge, GraphControls, NetworkList |
| components/theater | TheaterShell, RequirementRail, ProposalComparison, ActivityTimeline, EvidenceInspector, ApprovalSummary |
| components/voice | RecordControl, TranscriptEditor, MediaStatus, LocalizedPlayback; no provider credentials |
| features/participants | ProfileEditor, ConsentFields, AvailabilityEditor, OnboardingReview |
| features/missions | IntentEditor, RequirementReview, ConstraintEditor, MissionHeader |
| features/invitations | RedemptionGate, TermsSummary, ResponseActions, CounterproposalForm, ResponseReceipt |
| features/collaboration | ApprovedRoster, TaskList, LocalizedBrief, ImpactSummary, ReadOnlyReplay |
| client/queries | Authenticated TanStack Query snapshots and command adapters consuming shared Zod DTOs |
| client/events | Sequence reducer, snapshot reconciliation, permission reset, replay projection, semantic motion descriptors |
| client/state | Zustand selection/camera/pane/media preferences; no authoritative consent/mission truth |

Server snapshot and ordered events are authoritative; animation descriptor is disposable derived state. Test reducer against duplicates, gaps, permission changes, old events/new snapshots and seek; a motion completion never commits a mission. Contract requests for lead review: confirm a scoped mission detail/graph snapshot read endpoint (Graph DTO exists, HTTP route not specified); confirm public opted-in network endpoint, participant inbox read contract and localized-text/audio status fields; define supported audio upload bounds and permission-safe evidence detail. These are integration gaps to resolve, not permission to invent endpoints or modify shared contracts. UI can be designed against explicit isolated synthetic examples meanwhile.

## 12. Libraries, origins and licensing

No additional runtime library recommended. Keep approved React Flow, ELK, Motion, Radix/selective shadcn, Zustand, TanStack Query and Zod; compatible versions/security audit belong to authorized lead installation. Existing package version observations are not verified installations. React Flow MIT notices and ELK EPL/source/third-party notice obligations follow OPEN_SOURCE_ADOPTION. Preserve the exact chosen license/NOTICE for every resolved package; don't assume a repository license covers all bundled files.

V2 font use: local Space Grotesk from google/fonts, SIL OFL 1.1. Immutable commit, original URLs and SHA-256s are in ../proposal-v1/fonts/sources.json; notices retained alongside. Newsreader remains historical v1 material only. No modified fonts, no third-party app source, icon pack or proprietary artwork copied. Board graphics and layout authored for this proposal. No MiroFish reuse; OpenFlowKit/MiroFish remain conceptual references from existing audit, not an adopted visual system. Application license remains lead/user decision before publication.

Primary references consulted 24 October: [React Flow accessibility](https://reactflow.dev/learn/advanced-use/accessibility), [React Flow performance](https://reactflow.dev/learn/advanced-use/performance), [Motion reduced motion](https://motion.dev/docs/react-use-reduced-motion), [Space Grotesk OFL](https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt), [Newsreader OFL](https://github.com/google/fonts/blob/main/ofl/newsreader/OFL.txt). Local immutable font ledger is the reproducible source record. Performance and interaction recommendations here are COHUE design judgments, not claims that the libraries guarantee compliance.

## 13. Implementation sequence and approval

1. User reviews this complete proposal and board; record explicit visual approval/conditions in both handoffs. Feature implementation needs its own authorization. No silence or partial wireframe feedback counts as approval.
2. Once build is authorized, lead supplies shared Zod schemas/fixtures, common scaffold and resolved dependency versions. Frontend builds approved primitives and responsive shells against isolated labeled fixtures; backend proceeds independently within its boundaries.
3. Deliver text-first onboarding, reviewed composer and invitation/response forms; integrate actual scoped snapshots/commands, stale revision handling and second-device consent.
4. Build Theater graph + equivalent list + requirement/approval summaries and truthful events. Integrate decline/repair and activation/Room/tasks before optional visual flourishes.
5. Integrate three-language input/output media, attributed resources, failure fallbacks and basic Impact/Replay evidence. Advanced spatial effects/full replay only after core and recording gates; no mandatory scope silently removed.
6. Run desktop/phone end-to-end, permission/privacy, sequence/reconnect, stale-terms, keyboard, contrast and reduced-motion checks; profile graph, rehearse actual deployed flow and preserve lead's protected recording/submission window. D7 dispatcher evidence remains separate backend/lead gate.

Acceptance: all seven experiences at 320, 390, 768, 1024 and 1440px without page overflow; every action available without graph/voice; all eight motion meanings tied to verified events/media; no proposal shown as membership; English/Spanish/French terms and audio validated; decline preserves only valid accepted terms; real second-device response; authorized room/tasks; replay cannot mutate live state; offline/gap/denied/stale/provider failures covered. Run Playwright critical journeys plus meaningful reducer tests, screen-reader/keyboard/manual device checks, not merely screenshot comparisons. Record exact commands/device/browser/results after implementation.

Approval requested: (A) warm-neutral/white/blue visual direction and semantic colors; (B) Space Grotesk-only type system and scale; (C) light reading / light theater component treatments; (D) desktop theater and focused mobile list/graph/sheet model; (E) restrained event-driven motion language. A–E are a complete proposed system. They remain unapproved. Approval of this proposal alone does not authorize full feature work unless the user also says to begin implementation.

## 14. Logo concept checkpoint

See logos/concepts.png and logos/BRIEF.md. A Open Circle (letterform, recommended), B Confluence (abstract), C Common Language (wordmark-led). Original path-only SVGs, no copied library outlines or font-dependent text. Concepts are shown separately from the neutral interface identity. No logo selected or approved. User picks a direction; then prepare final geometry, reversed/small-size files, lockups, favicon/app-icon exports and compact usage guide before integrating the chosen mark throughout this design system. Full logo kit is intentionally pending the skill's concept checkpoint, not a missing production feature.

V2 visual proposal approval is separate from logo selection and feature authorization. This board does not authorize app development. All seven experiences/eight motion mappings and technical acceptance criteria above are retained.
