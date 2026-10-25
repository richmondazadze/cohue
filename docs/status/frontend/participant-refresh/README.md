# Participant experience refresh

25 October 2026. Routes: `/join`, `/me`. Current visual authority is the approved landing (`../landing-overhaul/DESIGN_LOOKUP.md`). No change to the landing or historical frozen design sources.

## Layout selection

Reviewed Efferd's free App Shell 1 and App Shell 2, plus Auth 2. Initially considered Shell 1's bounded form workspace; after the user's “Why not app shell 2” direction, selected **App Shell 2**: full-height sidebar, breadcrumb toolbar and bounded main content. Sources inspected through Efferd's public UI:

- https://efferd.com/blocks/app-shell#app-shell-2
- https://efferd.com/view/app-shell-2
- https://efferd.com/blocks/auth#auth-2

Adapted the structural pattern to COHUE using existing React/Radix primitives. No registry install, paid source, purchase, package/lock/config edits or added runtime dependency. The generic preview's fake analytics/settings/billing links, avatars, keyboard hints and sample changelog are not product features and were not imported. Navigation uses real COHUE routes. SVG icons are inline vectors; no emoji arrows or added icon package.

## Implemented

Shell: warm paper, Archivo, Instrument Serif accents, Open Circle, fine rules, blue selection and pill actions. Full-height desktop rail collapses to icons with accessible labels; mobile navigation is a Radix modal drawer with keyboard containment, Escape and focus restoration. Only these two routes use this shell. Existing session/providers/live alerts continue, with alerts layered above the rail. No continuous 3D or pointer tilt on these functional forms.

`/join`: four sequential steps with visited-step navigation; written description and recording/transcription review; explicit AI draft action; display name/language; search and selected-only offered-skill controls, levels/evidence/confirmation; needs/interests; availability/timezones and independent visibility/participation choices; complete review with direct edit links; save and server errors. Draft and save pending states prevent conflicting edits/navigation. Live summary is desktop-only; optional missing details are shown honestly. Validation appears both by the field and in an announced summary. Voice now ensures a browser session before first-time profile transcription, without automatically drafting or saving. No new server domain logic.

`/me`: inbox and profile are simultaneous sections, never tabs. Invitation cards show role, actual schedule/timezone, revision, status and deadline. Pending invitation links/QR remain explicit commands; self-view copy explains that the link is private and unsent. Profile lists language, skills/levels, needs, interests, all availability and separate participation/discovery/public-map states. Dedicated no-profile, session-unavailable and lost-profile-access states. Forgetting a reference is local-only. Delete sheet preserves versioned command, retention description and active-mission notice; Keep/Close return focus to the delete trigger.

## Motion and accessibility

Functional transitions: 220ms opacity/6px entrance, existing strong ease-out, no repeated marketing blur on editable content. Fine-pointer hover is color feedback; touch targets are at least44px. Reduced motion removes entry movement/animation. Radix supplies mobile drawer and confirmation-sheet semantics. Semantic list/progress, visible focus, labeled inputs and announced errors/pending states remain. Profile/invitation visibility never implies consent.

## Evidence and limits

Screenshots in `artifacts/` use clearly synthetic contract fixtures. Selected review views: `join-about-1440.png`, `join-skills-1440.png`, `join-time-390.png`, `join-review-1440.png`, `me-empty-1440.png`, `me-pending-invitation.png`, `me-delete-sheet-390.png`, `me-access-lost.png`. They are UI evidence, not live participant data or deployed provider evidence.

Production build and automated fixture journeys are recorded in `../PARTICIPANT_EXPERIENCE_REFRESH.md`. Manual CUA on the real local production server observed the new shell and honest API-unavailable state: local PostgreSQL connections time out, so real profile saves/provider calls could not be established. Tests do not bypass that limitation in production: mocks live only in tests. Physical-device, real provider and deployed acceptance remain separate. No other chats contacted.
