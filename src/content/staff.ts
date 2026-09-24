import type { ImageMetadata } from 'astro';
import jay from '@/assets/staff/jay-shirley.jpg';
import britt from '@/assets/staff/britt.jpg';
import sharon from '@/assets/staff/sharon-halle.jpg';

/** Leadership & staff — migrated from /staff. Bios lightly edited for length only. */

export type StaffMember = {
  name: string;
  role: string;
  photo: ImageMetadata;
  photoAlt: string;
  intro: string;
  bio: string[];
  email?: string;
};

export const staff: StaffMember[] = [
  {
    name: 'Rev. Jay Shirley',
    role: 'Pastor',
    photo: jay,
    photoAlt: 'Portrait of Pastor Jay Shirley smiling, wearing a brown jacket',
    intro:
      'Pastor Jay leads Sunday worship and our staff, deacons and session. He found faith — and his first surfboard — at age 11, and has been chasing both ever since.',
    bio: [
      'Pastor Jay came to Northminster from El Montecito Presbyterian Church in Montecito, CA, where he served as Associate Pastor for five years and then as Interim Pastor for nearly two, leading the congregation through a difficult season of transition.',
      'He brings 25 years of youth ministry experience, including 11 years as Youth Minister at the Village Church in Rancho Santa Fe, 9 years at Solana Beach Presbyterian, and 5 years as an Associate Pastor focused on youth in Oneonta. It was at Oneonta that he was ordained and discovered the importance of living out grace and trying to love others unconditionally, as Christ modeled.',
      'Jay was raised in a Christian home in south Texas. At 11, at a Methodist church summer camp, he discovered a personal relationship with Jesus — and bought his first surfboard. Surfing eventually led him to Westmont College in Santa Barbara. After graduating in 1976 he worked in the Texas oil fields for Conoco, then moved to San Diego in 1978, where he met his wife, Donna. He began seminary at Gordon-Conwell and finished his Master of Divinity at Bethel West.',
      'Jay and Donna have two adult children. Their son D.J. lives in North County with his wife Becca and son Corbin; their daughter Katie lives in San Francisco and works in tech. Jay’s passions include travel (especially to Europe) and, of course, surfing.',
    ],
  },
  {
    name: 'Britt',
    role: 'Worship Pastor',
    photo: britt,
    photoAlt: 'Portrait of Britt, Northminster’s worship pastor, smiling outdoors',
    intro:
      'Britt has spent more than three decades leading people into worship — from youth-group circles to full sanctuaries.',
    bio: [
      'Britt’s journey began over thirty years ago when he first picked up a guitar and discovered his love for worship. Since then he has dedicated himself to the craft, honing his skills and sharing his gift with others.',
      'From humble beginnings in youth group settings to leading worship in churches of all sizes, his heart remains fixed on one goal: to make room for moments where people connect with the presence of God.',
    ],
  },
  {
    name: 'Sharon Halle',
    role: 'Director, Northminster Preschool',
    photo: sharon,
    photoAlt: 'Portrait of Sharon Halle smiling in front of greenery',
    intro:
      'Sharon has been part of Northminster Preschool since 2009 — first as an assistant teacher, then lead teacher, and director since 2019.',
    bio: [
      'Sharon became director of Northminster Preschool in July 2019. A lot has changed since then, but the strong sense of community and love for our Northminster families remains the same.',
      'Originally from Wisconsin, Sharon graduated from the University of Wisconsin–La Crosse with a degree in Communications and worked in photography and catalog production before taking a few years off to raise her kids. She married Kevin in 1996; they have three children and one grandchild. She enjoys reading, country music and vacationing with family.',
      '“We are so blessed to have your children attend Northminster Preschool. Thank you for entrusting us with your child’s first years of school.”',
    ],
  },
];

export const supportStaff: { name: string; role: string }[] = [
  { name: 'Linda Qua', role: 'Administrative Assistant, Bookkeeper & Media Assistant' },
  { name: 'Sheila Mura', role: 'Treasurer' },
  { name: 'Johana Smith', role: 'Clerk of Session' },
  { name: 'Leigh Moyers', role: 'Preschool Administrator Assistant' },
  { name: 'Nate Landis', role: 'Urban Youth Collaborative Parish Associate' },
  { name: 'Alison', role: 'Youth & Family Nights contact' },
];
