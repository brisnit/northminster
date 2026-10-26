// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';

const fontsource = (/** @type {string} */ file) => `./node_modules/@fontsource-variable/${file}`;

export default defineConfig({
  // TODO(Northminster): confirm the production domain before launch.
  site: 'https://www.northminstersandiego.com',
  compressHTML: false,
  // Most pages are prerendered (static). Pages that read the events database
  // (/events, /events/[slug], the homepage events island, /admin) render on demand.
  adapter: vercel({
    imageService: true,
    maxDuration: 30,
  }),
  image: {
    // Event photos uploaded through the admin live in Vercel Blob.
    remotePatterns: [{ protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }],
  },
  security: { checkOrigin: true },
  vite: {
    // sanitize-html (CommonJS) requires the ESM-only htmlparser2; Vercel's
    // function runtime can't require() ESM, so bundle them at build time.
    // (Its whole dependency tree is bundled so nothing is left unresolved.)
    // Build only: the dev server loads it from node_modules as-is.
    ssr: {
      noExternal: !process.argv.includes('build') ? [] : [
        'sanitize-html', 'escape-string-regexp', 'htmlparser2', 'domelementtype', 'domhandler', 'domutils', 'dom-serializer',
        'entities', 'is-plain-object', 'launder', 'dayjs', 'parse-srcset', 'postcss', 'nanoid', 'picocolors', 'source-map-js',
      ],
    },
  },
  devToolbar: { enabled: false },
  // Old Squarespace URLs → new pages, so existing links and search results keep working.
  redirects: {
    '/about-us': '/about',
    '/staff': '/about/leadership',
    '/npc-construction': '/about/story',
    '/sundays': '/visit',
    '/ministries-1': '/visit',
    '/in-person-zoom-service-info': '/visit',
    '/youth-ministry': '/connect/kids',
    '/youth': '/connect/kids',
    '/summer-camp': '/connect/kids',
    '/pno-parent-night-out': '/connect/kids',
    '/new-events': '/events',
    '/calendar': '/events',
    '/blog-news': '/events',
    '/sermons': '/messages',
    '/missions': '/connect/outreach',
    '/community-outreach': '/connect/outreach',
    '/one-great-hour-of-sharing': '/connect/outreach',
    '/presbyterian-disaster-assistance': '/connect/outreach',
    '/uyc': '/connect/students',
    '/fellowshipbible-studies': '/connect/groups',
    '/garden': '/connect/garden',
    '/npc-community-garden': '/connect/garden',
    '/gardener-spotlight': '/connect/garden',
    '/contact-us': '/contact',
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'always' },
  fonts: [
    {
      name: 'Fraunces',
      cssVariable: '--font-display',
      provider: fontProviders.local(),
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          { src: [fontsource('fraunces/files/fraunces-latin-opsz-normal.woff2')], weight: '100 900', style: 'normal' },
          { src: [fontsource('fraunces/files/fraunces-latin-opsz-italic.woff2')], weight: '100 900', style: 'italic' },
        ],
      },
    },
    {
      name: 'Hanken Grotesk',
      cssVariable: '--font-body',
      provider: fontProviders.local(),
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          { src: [fontsource('hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2')], weight: '100 900', style: 'normal' },
        ],
      },
    },
  ],
});
