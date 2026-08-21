# Visual Design Guidelines

> The project has one visual family with mode-specific expression. These are project conventions, not a replacement for a feature's UX brief.

## Visual Point of View

The default Flight language is quiet utilitarian editorial: warm-neutral surfaces, strong typographic hierarchy, generous but purposeful spacing, restrained borders, and a small amount of feature-owned color. It should feel like a carefully edited personal tool library, not a generic SaaS template.

The visual system must support both practical tools and more expressive experiments. A calculator or data view prioritizes scanability; a home page or showcase may use asymmetry, imagery and choreography when those choices communicate the subject.

## Source of Truth and Decision Order

1. Product facts and task requirements win.
2. This document defines project-wide visual defaults.
3. A surface mode defines density, motion and composition emphasis.
4. A feature may introduce a local accent or visual treatment only when it remains accessible and explains the feature.

Do not copy a third-party skill's complete structure into the repository. Borrow a useful principle, translate it into this document, and make the resulting rule testable.

## Surface Variables

Every new surface or major feature brief should state these variables:

```yaml
mode: operate | persuade | read | experience
density: airy | comfortable | dense
motion: none | subtle | choreographed
variance: low | medium | high
theme: light | dark | system
accent: shared | feature-owned
```

These are descriptive controls, not a license to add decoration. `operate` and `dense` surfaces should normally use low variance and subtle motion. `experience` surfaces may use higher variance or choreography when the interaction has a clear purpose.

## Tokens

The first frontend scaffold should define semantic tokens in `frontend/src/shared/styles/`. Start with this baseline and adjust only through a documented design decision:

```css
:root {
  --color-canvas: #f7f6f3;
  --color-surface: #ffffff;
  --color-surface-muted: #efeee9;
  --color-ink: #171717;
  --color-muted: #6b6b67;
  --color-line: rgb(23 23 23 / 0.1);
  --color-focus: #2457c5;
  --radius-control: 0.375rem;
  --radius-surface: 0.75rem;
}
```

Use semantic names instead of scattering hex values through JSX. One feature may choose one accent token, but semantic success, warning and error colors remain distinct and must not be replaced by the feature accent.

## Typography

- Use one primary sans-serif family for UI, forms and data. Prefer a self-hosted or locally available family with a complete fallback stack; do not fetch Google Fonts at runtime.
- Use a display or serif face only when the surface is genuinely editorial, experiential or publication-like. Do not mix families inside a headline merely to make it look designed.
- Keep display headings wide enough to read naturally. A heading that wraps into six short lines is a layout failure; change width, scale or copy before adding decorative line breaks.
- Use monospace only for code, keyboard shortcuts, technical identifiers and data where the distinction helps.
- Do not use typography as a substitute for missing content or product proof.

## Layout and Surfaces

- Prefer CSS Grid for intentional multi-column layouts and declare the mobile collapse in the same component.
- Use asymmetry only when it improves hierarchy or expresses the feature. Do not use mathematically complex flexbox width calculations.
- Cards are optional. Use spacing, grouping and dividers when elevation does not communicate hierarchy.
- Choose one radius family per surface. Small controls may be more rounded than large surfaces, but the rule must be consistent.
- Avoid heavy shadows, neon glows, decorative crosshair lines, ornamental metadata strips and default glassmorphism.
- Gradients, grain, glass and high-motion effects are opt-in materials. A feature must state what they communicate and provide a solid, accessible fallback.
- Never force a hero, bento grid or AIDA sequence onto a tool surface that is primarily for completing a task.

## Color and Theme

- Start from the shared neutral palette and add at most one feature accent per surface.
- Do not default to AI-purple, saturated multi-color gradients or arbitrary color changes between sections.
- A surface chooses light, dark or system theme at its root. Sections must not randomly invert the theme.
- Test text, controls, focus rings, helper text and error states against their actual background. Target WCAG AA contrast.

## Motion

- Motion communicates hierarchy, storytelling, feedback or state transition. “It looks cool” is not a reason.
- Default to CSS transitions, IntersectionObserver or Motion for local interaction and entry reveals. Use GSAP only for genuine pinning, scrubbing or complex timeline work.
- Animate `transform` and `opacity` where possible. Do not drive continuous scroll or pointer values through React state.
- Every motion effect must have a `prefers-reduced-motion` fallback. Scroll hijacks, perpetual loops and magnetic effects must collapse to a usable static state.
- Cleanup observers, animation contexts and event listeners when a component unmounts.

## Assets and Content

- Use real or generated assets when imagery carries meaning. Do not create fake screenshots from empty rectangles.
- A tool UI may be its own visual asset; do not add decorative photography just to satisfy a landing-page rule.
- Do not invent testimonials, logos, metrics, engineering specifications or precision numbers.
- Visible copy should be plain, specific and consistent within one surface. Avoid generic startup phrases and decorative labels that do not help the user.
- Do not use emojis as structural UI or decoration. Use accessible icons from the project's chosen icon family.

## Accessibility and Responsive Quality

- Semantic HTML is required. Interactive controls must be keyboard-operable and have visible focus.
- Forms use labels above controls, helper text where needed and errors below the relevant control. Placeholder text is not a label.
- Loading, empty, error and success states are designed as part of the surface, not added after the happy path.
- Responsive behavior is explicit below 768px. High-variance layouts become a clear single-column flow unless horizontal interaction is the feature itself.
- Check both theme modes when supported, keyboard-only operation, narrow widths and reduced motion before declaring a surface complete.

## Review Checklist

- [ ] The surface mode and visual variables are declared.
- [ ] The layout serves the user's task rather than a fashionable pattern.
- [ ] Shared tokens are used instead of one-off colors and radii.
- [ ] There is one clear accent and one coherent theme per surface.
- [ ] Motion has a reason, cleanup and reduced-motion fallback.
- [ ] All important states and narrow-screen behavior are visible in the design.
- [ ] No AI template tells, fake proof or inaccessible controls were introduced.
