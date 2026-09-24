# Audit and strategy

## 1. The existing site (northminstersandiego.squarespace.com, September 2026)

**What's valuable:**
- A warm, detailed "what to expect" page (`/sundays`), including a clear explanation of kids on Sunday
- Honest, specific community facts: about 115 members, 50–60 in worship, multi-generational, a blend of contemporary and traditional worship
- A mission statement in the church's own words: "we love God and our neighbors as ourselves"
- Rich real photography: summer camp, garden, kitchen volunteers, fall festival, and an extraordinary **archive of 1953–1965 slides** documenting the sanctuary's construction
- Weekly recorded sermons (YouTube + MP3), preaching through Matthew
- A community garden with about 40 gardeners, and seven outreach partners

**What's holding it back:**
- The navigation has 7 menus and **40+ links**, including 11 monthly newsletter pages and pages named `new-page`, `new-page-1` and `ministries-1`
- The "Plan your visit" content is hidden under **Ministries → Sundays** and duplicated at `/ministries-1`
- The homepage leads with an institutional paragraph. Service time and address are near the bottom.
- Events and news are flyer screenshots (images of text): unreadable on phones and inaccessible to screen readers
- Pandemic-era notices are still live (2020–21 Zoom security notes, "not seeing clients due to COVID-19")
- Facts contradict each other: mailing ZIP, Monday Movie time, Wednesday end time
- The footer says "Have a wonderful rest of your day!" and "Powered by Squarespace", with no service info

## 2. What makes Elevation Church's site work

Principles adopted, not copied:
- **One clear promise in the hero**, with 2 CTAs and huge type over a full-bleed image
- **A featured sermon presented like premium media**: series art, speaker and date metadata, "Watch"
- **Only 5–6 top-level nav items** plus a persistent primary CTA
- **Visually distinct cards** for events, with minimal text on each
- **Ministries framed by purpose** ("Partnering with parents…"), not by department name
- **Alternating light and dark sections** for rhythm, and generous whitespace

Deliberately *not* adopted: the megachurch scale (multiple campuses, eFam, store, tickets), media-organization polish, and the "Welcome Home" framing. Northminster's advantage is intimacy, so the new site leans into being small ("Small enough that you'll be known by name").

## 3. Sitemap

```
/                       Home
/visit                  Plan your visit (time, place, what to expect, kids, online, FAQ)
/about                  Who we are, mission, beliefs (#beliefs), leadership + history teasers
  /about/story          1953–1965 archival timeline
  /about/leadership     Pastor, worship pastor, preschool director, support staff
/connect                Ways to belong, weekly rhythm, ways to serve (#serve)
  /connect/kids         Sunday School, Family Nights, Parents Night Out, Artsy Camp, Preschool
  /connect/students     Youth Group, older-kids group, Urban Youth Collaborative
  /connect/groups       Family Nights, Movie Nights, men's/women's studies, devotionals
  /connect/outreach     7 partners, mission trips, designated giving, special offerings
  /connect/garden       Community garden
/messages               Latest (video + audio) and recent messages
  /messages/[slug]      Message detail (video, audio, download, prev/next)
/events                 Upcoming events + weekly rhythm
/give                   Online, check, in person, designated, special offerings
/contact                Phone, email, address, form
```

**Navigation:** Visit · About ▾ · Connect ▾ · Messages · Events · Give, plus a **Plan your visit** button. On phones there is also a floating Plan your visit / Directions / Call bar.

**Pages not created**, because there wasn't enough real content: a standalone Worship page (covered in Visit and Leadership), a Beliefs page (a section of About), and Small Groups as a separate ministry (Northminster's groups are Family Nights and the studies).

## 4. First-time visitor walkthrough (phone, from Google)

1. **Lands on the homepage.** One screen shows real people in the sanctuary, "There's room at the table.", Plan your visit / Watch a message, and a "Join us Sunday 10:00 AM + address + Get directions" card.
2. **"Is this for people like me?"** The next section answers it: a small neighborhood church, "known by name", families, empty-nesters and retirees.
3. **Plan your visit:** four plain answers (time, place, kids, coffee), then a full page covering the hour minute by minute, kids, worship style, Zoom, and an FAQ that welcomes questions and doubts.
4. **The floating bar** keeps Directions and Call one tap away the whole time.
5. **Hesitating?** They can watch last Sunday's message in one tap, see real photos of real people, and read the 1953 story. Every page ends with "New to Northminster? We'd love to meet you."
