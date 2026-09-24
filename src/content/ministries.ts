import type { ImageMetadata } from 'astro';
import campLawn from '@/assets/photos/camp-lawn.jpg';
import kitchenBaking from '@/assets/photos/kitchen-baking.jpg';
import gardenGathering from '@/assets/photos/garden-gathering.jpg';
import campHall from '@/assets/photos/camp-hall.jpg';
import sanctuaryReading from '@/assets/photos/sanctuary-scripture-reading.jpg';
import memberSmiling from '@/assets/photos/member-smiling.jpg';

/**
 * Ways to belong — framed around people, not departments.
 * Mirrors Northminster's actual ministry structure (audited Sept 2026).
 */

export type Ministry = {
  slug: string;
  name: string;
  tagline: string;
  who: string;
  href: string;
  image?: ImageMetadata;
  imageAlt?: string;
  /** Set when no real photo exists yet — renders a clearly-marked placeholder. */
  photoNeeded?: string;
};

export const ministries: Ministry[] = [
  {
    slug: 'kids',
    name: 'Kids & Families',
    tagline: 'Where kids are known by name — and want to come back.',
    who: 'Ages 3 through 5th/6th grade',
    href: '/connect/kids',
    image: campLawn,
    imageAlt: 'A volunteer in a baseball cap sits on the lawn talking with two girls during summer camp',
  },
  {
    slug: 'students',
    name: 'Students',
    tagline: 'Dinner, real questions, and friends who have your back.',
    who: 'Grades 6–12',
    href: '/connect/students',
    image: campHall,
    imageAlt: 'Kids and leaders gathered around tables in the fellowship hall',
  },
  {
    slug: 'groups',
    name: 'Adults & Groups',
    tagline: 'Faith was never meant to be lived alone.',
    who: 'Bible studies, family nights, movie nights',
    href: '/connect/groups',
    image: kitchenBaking,
    imageAlt: 'Two women smiling as they bake together in the church kitchen',
  },
  {
    slug: 'outreach',
    name: 'Serve Our City',
    tagline: 'Loving our neighbors in Clairemont and across San Diego.',
    who: 'Outreach & mission partners',
    href: '/connect/outreach',
    image: memberSmiling,
    imageAlt: 'A longtime member smiling warmly on the church patio',
  },
  {
    slug: 'garden',
    name: 'Community Garden',
    tagline: 'Forty gardeners, one shared plot of Clairemont soil.',
    who: 'Open to the whole neighborhood',
    href: '/connect/garden',
    image: gardenGathering,
    imageAlt: 'Gardeners gathered at picnic tables beneath a vine-covered arbor in the community garden',
  },
  {
    slug: 'worship',
    name: 'Worship & Music',
    tagline: 'Contemporary songs, familiar traditions, one family.',
    who: 'Sundays at 10 AM',
    href: '/visit#what-to-expect',
    image: sanctuaryReading,
    imageAlt: 'A young girl reads scripture at the lectern while the congregation listens',
  },
];
