# Northminster design system

**Concept:** a neighborhood church with an editorial voice. The design takes its cues from Northminster's own 1965 sanctuary: the steep tented roof, walnut paneling, teal pew cushions and stained-glass ember and gold.

## Color

Tokens are defined in `src/styles/global.css`.

| Token | Hex | Use |
| --- | --- | --- |
| `--paper` | #F6F1E8 | Default background |
| `--sand` | #ECE4D6 | Alternate light sections |
| `--ink` | #1A1714 | Text, primary buttons |
| `--muted` | #5B5249 | Secondary text (6.8:1 on paper) |
| `--teal` | #1D5457 | Brand color: CTAs, accents, "New here" sections (7.6:1) |
| `--ember` | #A3441D | Eyebrows and italic emphasis on light backgrounds (5.5:1) |
| `--gold` | #E9B45C | Accents on dark backgrounds only (9.3:1 on night) |
| `--night` | #1C1916 | Dark sections, footer |

Every text pairing meets WCAG AA. Gold is never used as text on light backgrounds.

**Rhythm:** sections alternate paper → sand → night. Teal is saved for the invitation to visit.

## Typography

- **Display: Fraunces**, a variable font with optical sizing, weight 330–400. It is used for headlines, dates, numbers and pull quotes. *Italic* words carry the emotional beat of a headline ("There's room at the *table.*").
- **Body/UI: Hanken Grotesk.** Body text is 17–19px and fluid.
- **Eyebrows:** 13–15px uppercase with 0.14em tracking. They label every section ("Plan your visit", "What's happening").
- **Fluid scale:** `--step--1` through `--step-6`. The hero headline grows from about 58px on a phone to 168px on desktop.

## Components (`src/components/`)

| Component | Purpose |
| --- | --- |
| `SiteHeader` | Utility bar (service time + directions), main nav with accessible dropdowns, a "Plan your visit" CTA, and a `<dialog>` mobile menu. Variants: `overlay` (over a hero photo) and `solid`. |
| `SiteFooter` | Tagline, service info, address/phone/email, three link groups, denomination, and social links (auto-hidden when empty) |
| `MobileActionBar` | Phone-only floating bar with Plan your visit, Directions and Call. It appears after scrolling and hides at the footer. |
| `HomeHero` | Full-bleed hero with art direction (portrait photo on phones, wide on desktop) |
| `PageHero` | Interior hero: `image` (cinematic) or `plain` (editorial) |
| `SectionHeader` | Eyebrow + oversized title + intro + action. `align`: start / split / center |
| `FeatureSplit` | Photo and story side by side. Can be reversed. Accepts `photoNeeded` for placeholders. |
| `Photo` | Responsive WebP `<picture>` with lazy loading, reveal and hover zoom. `priority` for the LCP image. |
| `PhotoPlaceholder` | Clearly labeled stand-in that describes the photo needed |
| `MessageArt` | Typographic title card for a sermon, colored per message |
| `VideoPlayer` | Click-to-load YouTube (privacy-enhanced). Nothing loads until play is pressed. |
| `MessageCard`, `EventCard`, `MinistryCard`, `StaffCard` | Content cards. Events hide themselves after they end (`data-ends`). |
| `FactList`, `Faq`, `Timeline` | Label/value facts, `<details>` accordion, archival timeline |
| `NewHereCTA` | Closing invitation band (teal) |
| `NeedsInfo` | Yellow review marker for unconfirmed content |
| `Button`, `Icon`, `Logo` | Primitives. The logo mark is the sanctuary roofline with an open door. |

## Motion

All motion is disabled under `prefers-reduced-motion: reduce`. Content is fully visible without JavaScript.

- A staggered hero text entrance and a slow image "settle"
- Gentle hero parallax using CSS scroll-driven animations (no JavaScript)
- Section content fades up once as it enters the viewport
- Images reveal with a clip-path wipe; photos zoom slightly on hover
- Cross-page fades using native View Transitions (no JavaScript)

## Accessibility

- Semantic landmarks, a skip link, one `<h1>` per page and ordered headings
- Visible 3px focus rings (teal on light, gold on dark)
- Keyboard-operable dropdowns: Enter/Space to toggle, Escape to close and return focus
- The mobile menu is a native modal `<dialog>`, which traps focus and closes on Escape
- Every photo has descriptive alt text written from what is actually in the image
- External links are announced as "opens in a new tab"
- Touch targets are at least 44px

## Performance

- Static HTML with CSS inlined per page (no render-blocking requests)
- About 5 KB of JavaScript in total, all progressive enhancement
- Fonts are self-hosted and preloaded, with metric-adjusted fallbacks (CLS 0)
- Images are served as responsive WebP. Only the hero loads eagerly, with `fetchpriority="high"`.
- YouTube loads only on click
