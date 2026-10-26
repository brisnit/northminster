/**
 * The weekly rhythm of church life shown on /events and /connect.
 * Dated events are managed by staff in the admin (/admin/events) and stored
 * in the database — see docs/EVENTS-ADMIN.md.
 */

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
