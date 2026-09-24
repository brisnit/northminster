/**
 * Sermons — migrated from /sermons on the Squarespace site.
 * Each Sunday is recorded (YouTube video + MP3 audio).
 *
 * To add a message: copy the newest entry, update the fields, and put it
 * at the top of the list. The first entry is featured on the homepage.
 *
 * `series` groups messages. The current site doesn't name series, so
 * messages are grouped by the book being preached (currently Matthew).
 */

export type Sermon = {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  scripture?: string;
  series: string;
  speaker: string;
  youtubeId?: string;
  audioUrl?: string;
  kind?: 'sermon' | 'homily';
};

const AUDIO = 'https://static1.squarespace.com/static/5bc74e5fd74562db2c1eb9e4/t';

export const sermons: Sermon[] = [
  {
    slug: '2026-09-20-honest-doubt',
    title: 'Honest Doubt',
    date: '2026-09-20',
    scripture: 'Matthew 11:1–19',
    series: 'Matthew',
    speaker: 'Pastor Jay Shirley',
    youtubeId: 'DN02XD-kJz4',
    audioUrl: `${AUDIO}/6ab07d3f1bb1bb7c5e688d3a/1789951309279/NPC+audio+9-20-26.mp3`,
  },
  {
    slug: '2026-09-13-the-cost-of-following-jesus',
    title: 'The Cost of Following Jesus',
    date: '2026-09-13',
    scripture: 'Matthew 10:32–42',
    series: 'Matthew',
    speaker: 'Pastor Jay Shirley',
    youtubeId: 'slwzmNm0QDc',
    audioUrl: `${AUDIO}/6aa74a37e65c433c1198bb17/1789348423764/NPC+audio+9-13-26.mp3`,
  },
  {
    slug: '2026-09-06-hard-times-ahead',
    title: 'Hard Times Ahead',
    date: '2026-09-06',
    scripture: 'Matthew 10:17–31',
    series: 'Matthew',
    speaker: 'Pastor Jay Shirley',
    youtubeId: 'oW_AawZVx5E',
    audioUrl: `${AUDIO}/6a9dcd2561ee69381b8bda0d/1788726582043/NPC+Audio+09-06-2026.mp3`,
  },
  {
    slug: '2026-08-30-travel-instructions',
    title: 'Travel Instructions',
    date: '2026-08-30',
    scripture: 'Matthew 10:5–16',
    series: 'Matthew',
    speaker: 'Pastor Jay Shirley',
    youtubeId: 'FiZaLxsC6v4',
    audioUrl: `${AUDIO}/6a94a6eb53037f4eb8911c97/1788126968822/NPC+Church+Service+Audio+08-30-2026.mp3`,
  },
  {
    slug: '2026-08-23-its-go-time',
    title: 'It’s Go Time',
    date: '2026-08-23',
    // Listed on the old site as "Matthew 9: 35, 10-16" — confirm exact range.
    scripture: 'Matthew 9:35, 10–16',
    series: 'Matthew',
    speaker: 'Pastor Jay Shirley',
    youtubeId: 'y6FKmSEhQpI',
    audioUrl: `${AUDIO}/6a8b8f4d861759360faf5291/1787531099908/NPC+audio+8-23-26.mp3`,
  },
  {
    slug: '2026-08-16-faith-required',
    title: 'Faith Required',
    date: '2026-08-16',
    scripture: 'Matthew 9:27–38',
    series: 'Matthew',
    speaker: 'Pastor Jay Shirley',
    youtubeId: 'b2VM_ST2kdE',
  },
  {
    slug: '2026-07-26-an-unlikely-recruit',
    title: 'An Unlikely Recruit',
    date: '2026-07-26',
    scripture: 'Matthew 9:9–13',
    series: 'Matthew',
    speaker: 'Pastor Jay Shirley',
    youtubeId: 'DYqW3ri8B7M',
    audioUrl: `${AUDIO}/6a791715e97bb931af5120c0/1786320670172/NPC+Audio+7_26_2026.mp3`,
  },
  {
    slug: '2026-07-19-artsy-camp-sunday',
    title: 'VBS & Artsy Camp Sunday',
    date: '2026-07-19',
    series: 'Special Sundays',
    speaker: 'Pastor Jay Shirley',
    kind: 'homily',
    youtubeId: '_dqz6YlSPew',
    audioUrl: `${AUDIO}/6a5d64cc0a13915c9cab1281/1784505555938/NPC+Audio+7_19_2026.mp3`,
  },
  {
    slug: '2026-07-12-the-power-to-forgive',
    title: 'The Power to Forgive',
    date: '2026-07-12',
    scripture: 'Matthew 9:1–8',
    series: 'Matthew',
    speaker: 'Pastor Jay Shirley',
    youtubeId: '1YI8JzIzwbU',
    audioUrl: `${AUDIO}/6a542e5a08486069477e617b/1783901798680/NPC+Audio+7_12_26.mp3`,
  },
  {
    slug: '2026-07-05-the-cost-of-freedom',
    title: 'The Cost of Freedom',
    date: '2026-07-05',
    scripture: 'Matthew 8:28–34',
    series: 'Matthew',
    speaker: 'Pastor Jay Shirley',
    youtubeId: 'razPAWEyUSY',
    audioUrl: `${AUDIO}/6a4aba867d812a6da8040d9e/1783282324328/NPC+audio+7-5-26.mp3`,
  },
];

/** Full archive of older recordings lives on the previous site until migrated. */
export const sermonArchiveUrl = 'https://northminstersandiego.squarespace.com/sermons?offset=1783283056260';
