/**
 * Northminster Presbyterian Church — core facts.
 *
 * Everything here was taken from the existing Squarespace site
 * (northminstersandiego.squarespace.com, audited September 2026).
 * Anything that could not be verified is listed in `contentFlags`
 * and surfaced in docs/CONTENT-FLAGS.md — do not "fill in" guesses.
 */

export const church = {
  name: 'Northminster Presbyterian Church',
  shortName: 'Northminster',
  abbreviation: 'NPC',
  founded: 1953,
  sanctuaryDedicated: 'April 4, 1965',
  denomination: 'Presbyterian Church (U.S.A.)',
  denominationUrl: 'https://www.pcusa.org/',
  presbytery: 'Presbytery of San Diego',
  neighborhood: 'Clairemont',
  city: 'San Diego',

  address: {
    street: '4324 Clairemont Mesa Blvd',
    city: 'San Diego',
    region: 'CA',
    postalCode: '92117',
    landmark: 'Between Genesee Ave. and Clairemont Dr., right next to O’Reilly Auto Parts',
    lat: 32.8345369,
    lng: -117.2003176,
  },
  directionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=4324+Clairemont+Mesa+Blvd,+San+Diego,+CA+92117',
  mapsUrl:
    'https://www.google.com/maps/place/4324+Clairemont+Mesa+Blvd,+San+Diego,+CA+92117/@32.8345414,-117.2025063,17z',

  phone: '858-490-3995',
  phoneHref: 'tel:+18584903995',
  email: 'church@northminstersandiego.com',
  youthEmail: 'youth@northminstersandiego.com',

  service: {
    day: 'Sunday',
    time: '10:00 AM',
    short: 'Sundays at 10 AM',
    length: 'About 60 minutes',
    sermonLength: 'About 30 minutes',
  },

  giving: {
    onlineUrl:
      'https://www.eservicepayments.com/cgi-bin/Vanco_ver3.vps?appver3=tYgT1GfNxRUldiimjHMvOXhcSzjnmyj1ptll5Cf5nono-7YkZiNiYhc46uwjFenmums9tj3wI7okSf0MyMa8unSiYy5Z3M_314F6SoR7Ngk=&ver=3',
    checkPayableTo: 'Northminster Presbyterian Church',
  },

  links: {
    preschool: 'http://northminsterpreschoolsd.org/',
    calendar:
      'https://calendar.google.com/calendar/embed?src=northminster4324%40gmail.com&ctz=America%2FLos_Angeles',
    zoom: 'https://zoom.us/',
    uyc: 'https://www.uyc.org/',
  },

  /**
   * Social channels. The current site only references Instagram through a QR
   * code image, with no handle or URL. Add real URLs here to show them
   * in the footer — empty values are hidden automatically.
   */
  social: {
    instagram: '',
    facebook: '',
    youtube: '',
  },

  /**
   * Contact form endpoint (e.g. Formspree, Netlify Forms, Basin).
   * When empty, the contact form falls back to opening the visitor's
   * email app with the message pre-filled.
   */
  formEndpoint: '',
} as const;

export const fullAddress = `${church.address.street}, ${church.address.city}, ${church.address.region} ${church.address.postalCode}`;

export type NavLink = { label: string; href: string; description?: string };
export type NavItem = NavLink & { children?: NavLink[] };

export const primaryNav: NavItem[] = [
  { label: 'Visit', href: '/visit' },
  {
    label: 'About',
    href: '/about',
    children: [
      { label: 'Who we are', href: '/about', description: 'A small church with a big table' },
      { label: 'Our story', href: '/about/story', description: 'Clairemont, since 1953' },
      { label: 'Leadership', href: '/about/leadership', description: 'Meet our pastor and staff' },
      { label: 'What we believe', href: '/about#beliefs', description: 'Rooted in the Presbyterian tradition' },
    ],
  },
  {
    label: 'Connect',
    href: '/connect',
    children: [
      { label: 'Kids & families', href: '/connect/kids', description: 'Sunday School, Parents Night Out, camp' },
      { label: 'Students', href: '/connect/students', description: 'Youth group for grades 6–12' },
      { label: 'Adults & groups', href: '/connect/groups', description: 'Bible study, family nights, movie nights' },
      { label: 'Serve our city', href: '/connect/outreach', description: 'Outreach and mission partners' },
      { label: 'Community garden', href: '/connect/garden', description: '40 gardeners and counting' },
    ],
  },
  { label: 'Messages', href: '/messages' },
  { label: 'Events', href: '/events' },
  { label: 'Give', href: '/give' },
];

export const footerNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: 'New here',
    links: [
      { label: 'Plan your visit', href: '/visit' },
      { label: 'What to expect', href: '/visit#what-to-expect' },
      { label: 'Kids on Sunday', href: '/visit#kids' },
      { label: 'Contact us', href: '/contact' },
    ],
  },
  {
    heading: 'Church life',
    links: [
      { label: 'Watch messages', href: '/messages' },
      { label: 'Events', href: '/events' },
      { label: 'Find your community', href: '/connect' },
      { label: 'Community garden', href: '/connect/garden' },
    ],
  },
  {
    heading: 'About',
    links: [
      { label: 'Who we are', href: '/about' },
      { label: 'Our story', href: '/about/story' },
      { label: 'Leadership', href: '/about/leadership' },
      { label: 'Give', href: '/give' },
    ],
  },
];
