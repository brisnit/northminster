import type { ImageMetadata } from 'astro';
import { toInstant } from '@/lib/dates';
import kitchenVolunteers from '@/assets/photos/kitchen-volunteers.jpg';
import campCrafts from '@/assets/photos/camp-crafts.jpg';
import fallPumpkins from '@/assets/photos/fall-pumpkins.jpg';
import sanctuaryCongregation from '@/assets/photos/sanctuary-congregation.jpg';

/**
 * Dated events — migrated from /new-events and the September 2026 flyers.
 *
 * Past events are filtered out at build time AND hidden in the browser once
 * they end, so a stale deploy never advertises something that's over.
 * Rebuild the site at least weekly (see README) to refresh this list.
 */

export type ChurchEvent = {
  slug: string;
  title: string;
  start: string; // ISO local time, America/Los_Angeles
  end: string;
  /** Overrides the computed time range, e.g. when only “after worship” is known. */
  timeLabel?: string;
  location: string;
  summary: string;
  details?: string[];
  audience?: string;
  cost?: string;
  cta?: { label: string; href: string };
  image?: ImageMetadata;
  imageAlt?: string;
  featured?: boolean;
};

export const events: ChurchEvent[] = [
  {
    slug: 'parents-night-out-2026-09',
    title: 'Parents Night Out',
    start: '2026-09-25T18:00',
    end: '2026-09-25T20:30',
    location: 'Congdon Hall',
    summary: 'Drop the kids off for pizza, crafts, games and a movie. You go enjoy an evening off.',
    details: [
      'Ages: potty-trained through 5th grade',
      'Pizza, dessert, crafts, games and an age-appropriate movie',
      'Run by volunteers and leaders from our church',
      'Space is limited — register through the church office',
    ],
    audience: 'Kids',
    cost: '$10 per child or $15 per family',
    cta: { label: 'Call to register', href: 'tel:+18584903995' },
    image: campCrafts,
    imageAlt: 'Kids in matching blue shirts working on craft projects at a long table in the fellowship hall',
    featured: true,
  },
  {
    slug: 'monday-movie-night-2026-09-28',
    title: 'Monday Movie Night',
    start: '2026-09-28T17:30',
    end: '2026-09-28T19:30',
    location: 'The Lounge',
    summary: 'A faith-filled movie and good company. Bring a snack to share and meet us in the lounge.',
    audience: 'Everyone',
    featured: true,
  },
  {
    slug: 'wednesday-family-night-2026-09-30',
    title: 'Wednesday Family Night',
    start: '2026-09-30T17:30',
    end: '2026-09-30T19:30',
    location: 'Northminster campus',
    summary: 'A home-cooked dinner at 5:30, then Bible study for adults with Pastor Jay and youth groups for kids.',
    details: [
      'Dinner is served at 5:30 PM',
      'Adults: Bible study with the pastor',
      'Kids up to 4th grade: younger kids group',
      'Older kids: older kids group',
    ],
    audience: 'All ages',
    cta: { label: 'Questions? Email Alison', href: 'mailto:youth@northminstersandiego.com' },
    image: kitchenVolunteers,
    imageAlt: 'Three women laughing together while preparing food in the church kitchen',
    featured: true,
  },
  {
    slug: 'communion-sunday-2026-10-04',
    title: 'Communion Sunday',
    start: '2026-10-04T10:00',
    end: '2026-10-04T11:00',
    location: 'Sanctuary',
    summary: 'On the first Sunday of each month we share communion together — and our kids join us for it.',
    audience: 'Everyone',
    image: sanctuaryCongregation,
    imageAlt: 'The congregation seated in the sanctuary beneath its tall stained-glass windows',
  },
  {
    slug: 'second-sunday-cafe-2026-10-11',
    title: 'Second Sunday Café',
    start: '2026-10-11T11:00',
    end: '2026-10-11T12:30',
    timeLabel: 'Right after worship',
    location: 'After the 10 AM service',
    summary: 'Family Fun Sunday: stay after worship for a meal and fellowship. There’s a bounce house for the kids.',
    audience: 'Families',
    image: fallPumpkins,
    imageAlt: 'A church volunteer in Minnie Mouse ears helping a young child decorate pumpkins on the lawn',
    featured: true,
  },
];

/** The steady weekly rhythm of church life — never expires. */
export type Rhythm = { day: string; time: string; title: string; description: string; href?: string };

export const weeklyRhythm: Rhythm[] = [
  {
    day: 'Sunday',
    time: '10:00 AM',
    title: 'Worship',
    description: 'One service, about an hour. Coffee and donuts before and after. Sunday School for ages 3 through 6th grade.',
    href: '/visit',
  },
  {
    day: 'Sunday',
    time: '5:30 – 7:30 PM',
    title: 'Youth Group',
    description: 'Middle and high schoolers. Dinner at 5:30, group at 6. Check with Alison for this month’s dates.',
    href: '/connect/students',
  },
  {
    day: 'Monday',
    time: '5:30 PM',
    title: 'Movie Night',
    description: 'A faith-filled film in the lounge. Bring a snack to share.',
    href: '/connect/groups',
  },
  {
    day: 'Wednesday',
    time: '5:30 – 7:30 PM',
    title: 'Family Night',
    description: 'Home-cooked dinner, Bible study for adults, groups for kids. Takes a summer break.',
    href: '/connect/groups',
  },
  {
    day: 'Saturday',
    time: '9:00 AM',
    title: 'Garden Morning',
    description: 'Our community gardeners meet weekly to share joys, challenges — and produce.',
    href: '/connect/garden',
  },
  {
    day: 'Monthly',
    time: 'Friday evenings',
    title: 'Parents Night Out',
    description: 'Once a month, 6:00 – 8:30 PM. Registration opens on the 1st of each month.',
    href: '/connect/kids',
  },
];

export function upcomingEvents(now = new Date()) {
  return events
    .filter((e) => new Date(toInstant(e.end)) >= now)
    .sort((a, b) => a.start.localeCompare(b.start));
}
