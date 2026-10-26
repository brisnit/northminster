# Northminster Presbyterian Church — website

A rebuild of northminstersandiego.squarespace.com, designed first for someone who has never been to Northminster.

- **Stack:** [Astro 7](https://astro.build) on Vercel. Most pages are static; events, the staff admin (`/admin`) and APIs run on demand with Neon Postgres, Vercel Blob and Better Auth. It ships about 5 KB of JavaScript, and only for progressive enhancements.
- **Fonts:** Fraunces (display) and Hanken Grotesk (body), self-hosted through Astro's Fonts API with preloading and metric-matched fallbacks.
- **Images:** real Northminster photos. They are optimized at build time into responsive WebP.
- **Audits** (mobile, throttled): Lighthouse Performance 95–99. Accessibility, Best Practices and SEO all score 100. axe-core found 0 WCAG 2.1 AA violations across every page at 390px and 1440px.

## Commands

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs static site to dist/
npm run preview   # serve the production build locally
npm run check     # type-check
```

## Before launch

1. Resolve the items in [docs/CONTENT-FLAGS.md](docs/CONTENT-FLAGS.md). Until then, unconfirmed copy shows a yellow "Needs confirmation" marker on the page.
2. Hide the review markers by setting `PUBLIC_HIDE_CONTENT_FLAGS=true` at build time.
3. Set the production domain in `astro.config.mjs` (`site`).
4. Add social URLs and a form endpoint in `src/config/site.ts`. Without an endpoint, the contact form opens the visitor's email app.
5. Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages). Old Squarespace URLs redirect automatically (see `redirects` in `astro.config.mjs`).
6. **Schedule a weekly rebuild** (e.g. a Saturday-night deploy hook). Past events are also hidden in the browser automatically, but a rebuild keeps the "Coming up" list fresh.

## Updating content

All content lives in typed files in `src/content/`. No page code needs to change.

| To… | Edit | How |
| --- | --- | --- |
| Add Sunday's message | `src/content/sermons.ts` | Copy the top entry and paste it above. Update the title, date, scripture, YouTube ID (from the YouTube URL) and MP3 URL. The newest message is featured automatically. |
| Add or change an event | **Staff admin at `/admin`** | No code needed. See [docs/EVENTS-ADMIN.md](docs/EVENTS-ADMIN.md). Events sync to Google Calendar. |
| Change the weekly schedule | `weeklyRhythm` in `src/content/events.ts` | |
| Staff | `src/content/staff.ts` | Photos go in `src/assets/staff/`. |
| Ministries (homepage and Connect cards) | `src/content/ministries.ts` | |
| Visit page timeline and FAQ | `src/content/visit.ts` | |
| Outreach partners and offerings | `src/content/outreach.ts` | |
| Address, phone, service time, links | `src/config/site.ts` | This is the single source of truth for church facts. |

Photos: drop JPGs into `src/assets/photos/` and import them where needed. Astro resizes and compresses them. Upload the largest original you have (2000px+ wide).

## Project structure

```
src/
  config/site.ts        Church facts, navigation, links (single source of truth)
  config/flags.ts       Toggle for "needs confirmation" markers
  content/*.ts          Sermons, events, staff, ministries, visit FAQ, history, outreach
  components/           Reusable UI (see docs/DESIGN-SYSTEM.md)
  layouts/Base.astro    <head>, SEO, JSON-LD, header/footer, progressive-enhancement scripts
  pages/                One file per route
  styles/global.css     Design tokens, type scale, buttons, motion
  assets/               Real Northminster photography (optimized at build)
docs/
  AUDIT.md              Audit of the old site, Elevation takeaways, sitemap
  CONTENT-FLAGS.md      Facts Northminster must confirm
  EVENTS-ADMIN.md       Events CMS: staff guide, admin guide, Google Calendar setup, architecture
  DESIGN-SYSTEM.md      Color, type, components, motion, accessibility
  PHOTOGRAPHY.md        Shot list for a volunteer photographer
```
