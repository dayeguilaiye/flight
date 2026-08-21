# Surface Modes

> A feature chooses a mode based on what the visitor is trying to do, not on the feature's technology.

## Operate

Use for calculators, data analysis, editors, simulators and settings.

- Optimize for scanability, input clarity, feedback and error recovery.
- Keep variance low or medium and motion none or subtle.
- Use stable layouts, clear grouping and restrained decoration.
- Prefer actual data visualizations or the tool's own UI over marketing imagery.
- Define empty, loading, invalid, partial and successful states.
- AIDA, cinematic hero treatment and scroll hijacking are not defaults.

## Persuade

Use for the site home, a feature introduction, a launch page or a call to action.

- Establish one clear message, proof and next action.
- Asymmetry, a real visual asset, richer typography or a short motion sequence may be appropriate.
- AIDA can be used when the content is genuinely persuasive, but it is not a required page skeleton.
- Keep navigation, hero copy and calls to action concise and accessible.

## Read

Use for documentation, notes, explanations and experiment write-ups.

- Optimize for comprehension, wayfinding, readable measure and stable anchors.
- Use restrained motion and avoid visual interruption while reading.
- A serif or editorial treatment is optional, not automatic.
- Code, tables and figures should be rendered as real content, not decorative mockups.

## Experience

Use for portfolios, visual experiments, galleries and pages where the artifact itself is the subject.

- Let the artifact lead the first viewport.
- Higher variance, richer imagery and choreographed motion are allowed when they improve exploration.
- Pinning, horizontal movement or GSAP must have a clear narrative purpose and a static fallback.
- Keep controls discoverable and preserve keyboard and reduced-motion access.

## Mode Selection

When a feature could fit multiple modes, choose the mode for the primary visit:

| Primary visit | Mode |
|---|---|
| Complete a calculation or operation | `operate` |
| Decide whether to use or open something | `persuade` |
| Understand an explanation | `read` |
| Explore the artifact or interaction itself | `experience` |

A feature may contain multiple surfaces with different modes. For example, a calculator can have an `operate` tool page and a `persuade` introduction page while sharing the same feature domain and visual tokens.

## Surface Brief Template

Every new surface task should capture this small contract before implementation:

```yaml
mode: operate
job: "What the visitor is trying to accomplish"
primary_action: "The one action that defines success"
density: comfortable
motion: subtle
variance: low
theme: system
accent: feature-owned
required_states:
  - initial
  - invalid
  - success
  - error
responsive_fallback: "How the composition becomes usable below 768px"
```

The contract belongs in the feature task's `prd.md` or `design.md`. It does not replace the global visual guidelines and should not restate them.
