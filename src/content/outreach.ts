/**
 * Outreach & mission partners — migrated from /community-outreach, /uyc,
 * /missions and the special-offering pages. Pandemic-era status notes
 * ("not seeing clients", "monetary donations only") were removed because
 * they are outdated; confirm current needs with each partner.
 */

export type Partner = {
  name: string;
  focus: string;
  description: string;
  url?: string;
  howWeHelp?: string;
};

export const partners: Partner[] = [
  {
    name: 'Urban Youth Collaborative',
    focus: 'Students',
    description:
      'A coalition of 56 church partners supporting student-led faith clubs and assemblies at over 100 middle and high school campuses in San Diego County and Mexico. Each week, students serve physical and spiritual food to 3,240 of their friends.',
    howWeHelp:
      'We work with Pastor Nate Landis to organize volunteers who mentor students at Clairemont High and the Creative, Performing & Media Arts School (CPMA).',
    url: 'https://www.uyc.org/',
  },
  {
    name: 'New Day Urban Ministries',
    focus: 'Housing & recovery',
    description:
      'A mission of the Presbytery of San Diego that restores lives by providing essential services to people experiencing homelessness, the urban poor, veterans and those recently released from prison — in a safe, home-like setting where everyone is treated with dignity.',
    url: 'https://www.newdayurbanministries.org',
  },
  {
    name: 'South Sudanese American Presbyterian Fellowship',
    focus: 'Refugee community',
    description:
      'Also a mission of the Presbytery, SSAPF gathers in City Heights to minister to refugees from South Sudan who escaped a brutal civil war.',
  },
  {
    name: 'Serving Seniors',
    focus: 'Seniors',
    description:
      'Two in five San Diego seniors have to choose between rent and food. Together with Thrivent, we’ve spent years hosting birthday parties and holiday events and collecting much-needed items for low-income and unhoused seniors downtown.',
    url: 'https://www.servingseniors.org',
  },
  {
    name: 'Community Christian Service Agency',
    focus: 'Emergency help',
    description:
      'An ecumenical agency providing food, clothing, referrals and counseling to individuals and families in need across San Diego County. We also collect backpacks and school supplies for CCSA each fall.',
    url: 'https://www.ccsasandiego.org',
  },
  {
    name: 'San Diego Military Outreach Ministries',
    focus: 'Military families',
    description:
      'Help with basic needs, and events that lift the burdens on junior enlisted military families (E5 and below) across San Diego County — families of all faiths.',
    url: 'http://www.sandiegomom.org/',
  },
  {
    name: 'Interfaith Shelter Network',
    focus: 'Shelter',
    description:
      'Congregations, agencies and government programs working together to provide shelter and resources to homeless individuals and families as they move toward self-sufficiency.',
    url: 'http://interfaithshelter.org/',
  },
];

export const specialOfferings = [
  {
    name: 'One Great Hour of Sharing',
    season: 'Lent – Easter',
    description:
      'An ecumenical offering since 1946 that supports Presbyterian Disaster Assistance, the Presbyterian Hunger Program and Self-Development of People.',
  },
  {
    name: 'Pentecost Offering',
    season: 'Pentecost',
    description: 'Received each spring through Pentecost Sunday. Envelopes and red-and-white banks are on the narthex table.',
  },
  {
    name: 'Christmas Joy Offering',
    season: 'Advent',
    description: 'A denomination-wide offering received during Advent each December.',
  },
  {
    name: 'Presbyterian Disaster Assistance',
    season: 'As needs arise',
    description: 'Designated gifts are forwarded to PDA, which works alongside Church World Service to respond to disasters around the world.',
  },
];
