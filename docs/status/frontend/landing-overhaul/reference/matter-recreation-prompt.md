Recreate the website "MATTER — Make digital feel physical" with high visual fidelity as a high-performance 3D/interactive landing page. The result must match the supplied reference, focusing on its specific architectural typography, glass/physics interactions, and smooth-scroll-driven layering.

### Preserve Source Quirks:
- Section names use specific hyphenated labels like "01 — Kinetic sculpture".
- Custom cursor system is mandatory (dot + ring).
- Font stretching/blurring effect is tied to scroll velocity via `--stretch` and `--mblur` CSS variables.
- Layout uses a specific vertical rail navigation on the right side with dot indicators.

### CRITICAL FIDELITY CONSTRAINTS
- All content must be rendered live in-browser using Three.js; do not use video or image fallbacks for 3D elements.
- No standard scrollbars; use a fixed canvas background (`#gl`) and a spacer div (`#sizer`) to drive scroll logic.
- Layers must use strict z-index stacking: Canvas (0), MaskLayer (1), Sections (2), Panel (5), Nav/Rail (6), Cursor/Ring (10).
- Typography must use exact Archivo (stretchable sans) and Instrument Serif (italic) pairings.

### TECH STACK / DEPENDENCIES
- Three.js (v0.170.0)
- Three.js Post-processing: EffectComposer, RenderPass, UnrealBloomPass, OutputPass
- Tailwind CSS (via CDN) for utility layout
- Google Fonts: Archivo (wdth/wght axis 75..125), Instrument Serif (italic)
- Custom Spring Physics: Stiffness 120/160, Damping 15/16

### GLOBAL STYLE
- Background: `#f3f2ee` (Pearl)
- Foreground: `#0a0a0b` (Ink)
- Accents: `#2a5bff` (Blue), `#7b4dff` (Violet)
- Cursor: Custom difference blend mode circular cursor.
- Gutter: `4vw` (desktop), `6vw` (mobile).

### ASSET MAP
(Used within the 3D gallery section)
- Asset 1: https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/b9d7b279-dc31-4a7e-ad91-dfb672f40ff3_original.webp
- Asset 2: https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/f16ef52a-4451-482b-bf8a-3c201c13fff8_original.webp
- Asset 3: https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/12ef4162-2b92-493e-b312-b2c4b4356483_original.webp
- Asset 4: https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/05c4ed0d-d8f1-4697-bd49-b338e9de7ec4_original.webp
- Asset 5: https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/fd111e42-5bd1-4bd8-8ac0-76c4d973df51_original.webp

### VECTOR / ICON SHAPES
- Custom Underline SVG: Path with `stroke-width: 1.2` and no fill, used on hoverable links.
- Mask SVG: `<mask id="flatMask">` containing `<text id="maskText">FEEL FLAT</text>` to create a cutout effect over the 3D scene.

### MEDIA BEHAVIOR
- 3D elements must react to `requestAnimationFrame` loop.
- Cursor interaction: Magnetic effect on characters using Spring physics.
- Scroll behavior: `ScrollState` maps `scrollY` to section visibility and 3D camera transforms.

### LAYER STACK / POSITIONING MAP
- **Base Layer:** Canvas `#gl` (Fixed, inset 0, z-0).
- **Mask Layer:** `#maskLayer` (Fixed, inset 0, z-1, pointer-events: none).
- **Interactive Content:** `.ch` (Fixed, inset 0, z-2) - individual sections toggle `visibility` and `opacity` based on scroll progress.
- **Full-screen Menu:** `#panel` (Fixed, inset 0, z-5, clip-path circle transition from nav button).
- **Interface:** `#nav` and `#rail` (Fixed, z-6).
- **Cursor:** `#cursor` and `#ring` (Fixed, z-10, mix-blend-mode: difference).

### SECTION BY SECTION
1. **Hero (`#ch-hero`):**
   - Copy: "MAKE DIGITAL feel physical."
   - Motion: Text reveal with `translateY` and `scaleX` on character spans.
   - Visuals: Live 3D kinetic sculpture centered.
2. **Matter Statement (`#ch-matter`):**
   - Copy: "DIGITAL SHOULDN’T... Screens are matter."
   - Layout: Two lines of centered text in Archivo Bold.
3. **3D Gallery (`#ch-gallery`):**
   - Features: A draggable/scrollable carousel of 3D objects.
   - Detail Panel: Sliding drawer from the right (`transform: translateX(104%)` to `0`) with backdrop-blur.
4. **Architectural Typo (`#ch-typo`):**
   - Words: DESIGN, MOTION, DEPTH, CODE.
   - Behavior: 3D perspective words that open as corridors during scroll.
5. **Physics Lab (`#ch-physics`):**
   - Interaction: "Click to scatter, move to push". Live particles/objects with collision.
   - Stats: Live counters for objects/FPS.
6. **Final/Footer:**
   - Large "MATTER" wordmark in Archivo Bold.
   - Footer links arranged in a 4-column grid.

### IMPLEMENTATION REQUIREMENTS
- Use a standard `loop(now)` function for the 3D scene and UI spring updates.
- Implement `splitChars` to wrap every text character in a `<span>` for magnetic/reveal effects.
- Ensure the menu uses the `clip-path: circle(0px)` to `circle(160vmax)` transition centered on the menu button.
- Use `pointer-events: none` on all overlay containers unless they contain buttons/links (`.ia`).
- Preserve responsive behavior: On mobile (<820px), hide the scroll rail and stack footer columns 2x2.