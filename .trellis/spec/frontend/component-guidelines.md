# Component Guidelines

> Components are composable React functions with explicit props and accessible HTML.

## Component Structure

Keep components focused on rendering and user interaction. Put calculations and transformations in pure feature-domain modules. A page coordinates feature components; it must not contain a second copy of domain rules or API serialization.

## Props Conventions

Define props with a nearby `type` or `interface`; make optionality explicit and avoid `React.FC` solely for typing. Prefer `children` for composition and discriminated unions for mutually exclusive variants. Use callbacks named by intent (`onSubmit`, `onChange`) rather than DOM-specific plumbing.

## Styling Patterns

Tailwind utility classes are the default. Repeated visual patterns become a shared primitive with a small variant API, not copied class strings. Avoid arbitrary values unless a design token cannot express the requirement; keep feature styling inside the feature unless it is truly shared.

## Accessibility

Use semantic elements, visible labels, keyboard-operable controls, focus styles and status announcements for async results. Icon-only buttons need an accessible name. Do not use a clickable `div` when a `button` or link expresses the interaction.

## Common Mistakes

Avoid components that fetch unrelated data, accept an unbounded `...props` bag, or expose internal state transitions as public callbacks. Do not move a component to `shared/ui` after one use.
