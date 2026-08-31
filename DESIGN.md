---
name: Flight
description: A quiet editorial family for independent experiments and useful tools.
colors:
  ink: "#20201d"
  paper: "#f4f1ea"
  paper-deep: "#e9e6dc"
  signal: "#d46b45"
  signal-accessible: "#b34e33"
  moss: "#68735f"
  moss-accessible: "#626d59"
  focus: "#2457c5"
typography:
  display:
    fontFamily: "Georgia, serif"
    fontSize: "clamp(2.25rem, 6vw, 8rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.03em"
  editorial-cn:
    fontFamily: "Noto Serif SC, Songti SC, STSong, serif"
    fontSize: "clamp(2.3rem, 3vw, 3.35rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  precise: "4px"
  control: "6px"
  soft: "12px"
  surface: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  field:
    backgroundColor: "rgba(255, 255, 255, 0.5)"
    textColor: "{colors.ink}"
    rounded: "{rounded.soft}"
    padding: "12px 16px"
  tool-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.precise}"
    padding: "28px 24px"
  chord-choice-active:
    backgroundColor: "rgba(179, 78, 51, 0.08)"
    textColor: "{colors.signal-accessible}"
    rounded: "{rounded.precise}"
    padding: "8px 13px"
  piano-key-active:
    backgroundColor: "{colors.signal-accessible}"
    textColor: "#ffffff"
    rounded: "{rounded.precise}"
---

# Design System: Flight

## Overview

**Creative North Star: "The Edited Workbench"**

Flight should feel like a carefully edited personal workroom: warm enough to invite exploration, precise enough to trust with real tasks, and quiet enough that each experiment remains the subject. The visual family is editorial rather than corporate. Typography, rules, spacing, and the tool's own interface carry the identity; decorative marketing furniture does not.

Independent tools may choose their own composition and a deeper local expression of the shared palette. They do not inherit a mandatory header or page frame. What stays constant is warm paper, near-black ink, deliberate hierarchy, restrained accents, semantic HTML, and clearly authored interaction states.

**Key Characteristics:**

- Warm paper grounds every light surface.
- Ink rules and spacing establish hierarchy before cards or shadows.
- One terracotta signal and one muted moss support state and context.
- Editorial type is wide, readable, and paired with compact utilitarian labels.
- Each tool owns its layout while remaining visibly part of the same collection.

## Colors

The palette resembles ink, uncoated paper, oxidized green, and fired clay; saturation stays low so state changes remain legible without turning the surface into a dashboard.

### Primary

- **Fired Clay Signal:** Use `signal` for shared emphasis where large text or non-text state carries meaning. Use `signal-accessible` whenever small light text sits on the accent or the accent itself is small text.

### Secondary

- **Archive Moss:** Use `moss` for larger contextual labels and subdued state. Use `moss-accessible` for small copy on paper.

### Neutral

- **Soft Ink:** `ink` is the default text, dark control, and strongest rule color.
- **Uncoated Paper:** `paper` is the principal canvas; `paper-deep` is a quiet secondary surface, never a random alternating section color.
- **Proofing Blue:** `focus` is reserved for keyboard focus and must not be repurposed as a decorative accent.

**The One Signal Rule.** A surface may deepen terracotta or moss for contrast, but it does not introduce a second decorative accent family.

**The Contrast Pair Rule.** Small text must use the accessible signal or moss variants; the lighter shared variants are not acceptable merely because the hue looks correct.

## Typography

**Display Font:** Georgia for shared editorial Latin display, with a serif fallback.

**Body Font:** Inter with platform sans-serif fallbacks for compact tool UI. Feature-owned editorial reading surfaces may self-host a complete face; the music-theory surface uses Noto Serif SC at 400 and 600 for Chinese and Latin coverage.

**Character:** Display type supplies the library-like voice while compact body and label text keep tools operational. Do not mix faces inside a heading for effect.

### Hierarchy

- **Display:** Regular, broad, tightly tracked, and used for a page's primary identity rather than every section.
- **Editorial Chinese:** Semibold, close-set, and balanced; use for music-theory titles and explanatory structures.
- **Title:** Serif at roughly 1.5–2.25rem for major tool sections.
- **Body:** Regular with a 1.6–1.75 line height and a preferred reading measure of 65–75 characters.
- **Label:** Compact semibold text for form labels, states, and navigation; uppercase tracking is appropriate only for genuinely categorical metadata.

**The Wide Heading Rule.** A display heading should read as one decisive shape and never collapse into six short decorative lines.

## Layout

Shared surfaces use a centered maximum width with generous outer gutters, but tool pages may replace the container with a feature-owned workbench. The home page is an airy editorial index. The LLM tester is a responsive two-column operating surface. Music theory uses a complete course rail, lesson column, inspector, and docked piano at wide sizes.

Spacing follows a simple 4/8/16/24/32 rhythm, with 64px or more separating independent editorial sections. Related controls sit close together; prose gets more air above a new idea than below its heading.

Below the surface's documented breakpoint, high-density compositions become a single readable flow. Music theory switches to page flow below 1100px and a one-column phone composition below 700px; its complete course tree remains one action away in a focus-managed drawer. Horizontal overflow is never the responsive strategy unless the instrument itself requires it.

**The Page-Owned Frame Rule.** Routing chooses the surface but does not render a shared visual header, shell, or mandatory tool chrome.

## Elevation & Depth

Flight is flat by default. Paper tones, 1px ink rules, and spacing express hierarchy. Shadows are reserved for a floating mobile drawer or a fixed piano dock where the overlap is real; they use a slight directional offset and broad, low-opacity blur.

**The Structural Depth Rule.** If two surfaces do not physically overlap, separate them with space, tone, or a rule instead of a shadow.

## Shapes

Editorial and instrument surfaces use precise 4–6px corners. Form-heavy operating surfaces may use 12–16px corners to group dense controls. Fully rounded pills belong to compact actions, statuses, and language switches; they are not the default container shape.

Borders are fine and low-contrast at rest, then become clearer on hover or selection. Circles are reserved for compact semantic markers such as arrows, note roles, and status indicators.

## Components

### Buttons

- **Shape:** Primary operating actions are compact pills; editorial lesson actions use precise corners.
- **Primary:** Ink on paper or paper on ink, with terracotta reserved for the active state or a deliberate hover.
- **Hover / Focus:** State changes are short and quiet. Keyboard focus uses a visible proofing-blue outline with offset.
- **Disabled:** Lower contrast and remove the action cursor without erasing the label.

### Cards / Containers

- **Corner Style:** Soft corners for dense forms; precise corners for editorial lessons and diagrams.
- **Background:** Paper, translucent white over paper, or ink for one high-contrast operating region.
- **Shadow Strategy:** Flat at rest; use rules and tonal grouping.
- **Border:** A single 1px ink-derived border, never a border plus decorative shadow.

### Inputs / Fields

- **Style:** Label above, translucent paper-white fill, one restrained border, and enough vertical space for touch.
- **Focus:** Preserve the global focus outline or strengthen the field border with the signal color.
- **Error / Disabled:** Error has distinct meaning and localized recovery copy; disabled state remains readable.

### Navigation

Navigation uses semantic links, visible current state, and quiet ink or moss text. The home page presents tools as full-width editorial rows. Dense feature navigation may use a complete rail or an accessible drawer, but never hides destinations behind progress gates.

### Chord Choice and Piano Keys

The music-theory signature connects a named structure to exact keys and sound. Chord choices expose degree, numeral, root, and quality. Every selected piano member uses accessible terracotta plus a non-color R/3/5 marker; the root is not the only colored note.

## Do's and Don'ts

### Do:

- **Do** let each tool choose the layout that best serves its task.
- **Do** establish hierarchy with type, spacing, and ink rules before adding containers.
- **Do** use self-hosted fonts when a feature depends on a distinctive editorial face.
- **Do** keep links semantic, focus visible, small text WCAG AA, and mobile touch targets usable.
- **Do** make selected states understandable through text or shape as well as color.

### Don't:

- **Don't** add a global visual header merely because the project has multiple routes.
- **Don't** turn tools into generic card dashboards, bento grids, or marketing landing pages.
- **Don't** introduce gradients, glass, heavy shadows, fake proof, or ornamental metrics without a product reason.
- **Don't** use gamified progress, gates, streaks, or badges for exploratory learning surfaces.
- **Don't** invent a new accent hue when a darker accessible variant of the shared palette will work.
