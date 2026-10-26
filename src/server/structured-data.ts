import type { PublicEvent } from './public-events';
import { church, fullAddress } from '@/config/site';

/** schema.org Event JSON-LD for search engines. */
export function eventJsonLd(e: PublicEvent, siteUrl: string) {
  const iso = (d: Date) => d.toISOString();
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.summary || undefined,
    startDate: e.allDay ? e.date : iso(e.start),
    endDate: e.allDay ? e.endDate : iso(e.end),
    eventStatus: e.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: new URL(`/events/${e.slug}`, siteUrl).href,
    image: e.image ? [e.image.url.startsWith('/') ? new URL(e.image.url, siteUrl).href : e.image.url] : undefined,
    location: {
      '@type': 'Place',
      name: e.venue ? `${e.venue}, ${church.name}` : church.name,
      address: e.address || fullAddress,
    },
    organizer: { '@type': 'Organization', name: church.name, url: siteUrl },
    ...(e.cost ? { offers: { '@type': 'Offer', description: e.cost, url: e.registrationUrl || new URL(`/events/${e.slug}`, siteUrl).href } } : {}),
  };
}
