# Content that needs Northminster's confirmation

Nothing on the new site was invented. Where the old site was silent, outdated or contradictory, the item is listed here. Items marked **(marked on page)** show a yellow "Needs confirmation" tag until `PUBLIC_HIDE_CONTENT_FLAGS=true`.

## Missing information: please supply

| Item | Where it appears | Notes |
| --- | --- | --- |
| **Parking**: where to park, accessible spaces, which entrance | Visit → Where we are; Visit FAQ **(marked on page)** | First-time visitors often ask this. It is not on the current site. |
| **Accessibility**: step-free entrance, restrooms, hearing assistance | Visit | Not on the current site. |
| **What to wear** | Visit FAQ **(marked on page)** | Suggested copy: "Whatever you're comfortable in." |
| **Do I need to register?** | Visit FAQ **(marked on page)** | Suggested copy: "Nope. Just come." |
| **Church office hours** | Contact **(marked on page)** | A 2020 flyer mentioned "Monday–Friday 8 am–noon". Confirm whether this is current. |
| **Sunday School check-in and background-check policy** | Kids **(marked on page)** | The site says only "trained volunteers." |
| **Statement of faith** | About → What we believe **(marked on page)** | Built only from Northminster's own words and its PC(USA) membership. Pastor/session should review. |
| **Britt's last name**; **Alison's full name and title** | Leadership **(marked on page)** | Alison appears on flyers as the contact at youth@northminstersandiego.com. |
| **Instagram / Facebook / YouTube URLs** | Footer (hidden until added) | The current site only shows an Instagram QR code image. |
| **Production domain** | `astro.config.mjs` | Assumed `www.northminstersandiego.com`, based on the email domain. |
| **Contact form service** | `src/config/site.ts` → `formEndpoint` | Squarespace forms don't transfer. Without an endpoint, the form falls back to email. |

## Conflicts on the current site: please resolve

| Item | Conflict | Used on new site |
| --- | --- | --- |
| **Mailing ZIP for checks** | The Give page says **92124**. Everywhere else says **92117**. | 92117 **(marked on page)** |
| **Monday Movie Night start** | Homepage and September flyer say **5 PM**. The events page and movie flyer say **5:30 PM**. | 5:30 PM **(marked on page)** |
| **Wednesday Family Night end** | Homepage says **5:30–7 PM**. The September 2026 flyer says **5:30–7:30 PM**. The events calendar shows 11:30 AM, which looks like a time-zone data error. | 5:30–7:30 PM |
| **Sunday School age range** | "Preschool–6th grade" / "3 years to 6th grade" / "3 year olds through 6th graders" | Ages 3 through 6th grade |
| **Scripture for Aug 23, 2026 message** | Listed as "Matthew 9: 35, 10-16" | Shown as written |

## Items to verify are still current

- **Men's Study** (Sat 8–9 AM) and **Women's Study** (Sat 8:30–10 AM): only single September dates were listed. How often do they meet? **(marked on page)**
- **Artsy Adventure Camp sign-up form** (Google Form): confirm it is the current form. **(marked on page)**
- **Seasonal Zoom devotionals** (weekdays 8 AM, Advent and Lent): based on 2025–26 news posts.
- **Pastor Jay's Zoom prayer group** (Mon & Thu 7:30–8 AM): found on an undated flyer and **not** used on the site. Add it to `src/pages/connect/groups.astro` if it is still running.
- **Outreach partners**: the pandemic-era notes ("not seeing clients", "monetary donations only") were removed. Confirm which partnerships are active today.
- **Mission trips**: only the 2018 Rockport, TX trip is documented.

## Timing assumptions

- The Visit page's Sunday timeline (10:00 / 10:10 / 10:15 / 10:20 / 11:00) is approximate. It comes from "first 10 minutes of music" and "about fifteen minutes into the service", and the page says so.
- **Second Sunday Café** is described as "right after worship". No specific time is given.

## Intentionally not migrated

- **Newsletters** (Jul 2021 – Feb 2025), the **Advent/Lent devotional** archives and the **"Gardener Spotlight"** page. These are dated archive content. Keep them on the old site or export them to PDFs if they should stay available.
- The **Ephesians / 2 Peter study questions** (2020) on the Fellowship page.
- **Sermon recordings older than July 2026.** The Messages page links to the old archive. Import them into `src/content/sermons.ts` if wanted.
- The **Google Calendar embed**. The site links to the calendar instead, because an embedded iframe hurts performance and mobile use.

## Suggested copy to review

The rewrite keeps the church's own phrases wherever possible, such as "we love God and our neighbors as ourselves", "multi-generational", and "coffee and a donut". Headlines and reassurance lines were written new. Please read these for tone:

- The hero: "There's room at the table."
- The footer tagline: "Love God. Love our neighbors. Save you a seat."
- The Visit worship copy: "Sit anywhere. Sing if you like. Nobody will put you on the spot."
