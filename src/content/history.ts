import type { ImageMetadata } from 'astro';
import s01 from '@/assets/history/slide-01.jpg';
import s02 from '@/assets/history/slide-02.jpg';
import s03 from '@/assets/history/slide-03.jpg';
import s04 from '@/assets/history/slide-04.jpg';
import s05 from '@/assets/history/slide-05.jpg';
import s06 from '@/assets/history/slide-06.jpg';
import s07 from '@/assets/history/slide-07.jpg';
import s09 from '@/assets/history/slide-09.jpg';
import s10 from '@/assets/history/slide-10.jpg';
import s11 from '@/assets/history/slide-11.jpg';
import s12 from '@/assets/history/slide-12.jpg';
import s14 from '@/assets/history/slide-14.jpg';
import s19 from '@/assets/history/slide-19.jpg';
import s25 from '@/assets/history/slide-25.jpg';
import s28 from '@/assets/history/slide-28.jpg';
import s30 from '@/assets/history/slide-30.jpg';
import s31 from '@/assets/history/slide-31.jpg';

/** "The Early Days of NPC" — archival slides and captions from the original site. */

export type Moment = { date: string; caption: string; image: ImageMetadata; alt: string };

export const history: Moment[] = [
  { date: '1953', caption: 'The site of the permanent Northminster Presbyterian Church — open mesa, before Clairemont filled in around it.', image: s01, alt: 'An empty, sandy lot on the Clairemont mesa in 1953' },
  { date: 'December 1953', caption: 'The organizing church met in a Clairemont duplex.', image: s02, alt: 'A small 1950s duplex home on a quiet Clairemont street' },
  { date: '1953', caption: 'Founding pastor Rev. Howard Congdon organized Northminster.', image: s03, alt: 'Rev. Howard Congdon standing at the door of a home in a dark suit' },
  { date: 'April 25, 1954', caption: 'Ground breaking for Northminster’s permanent home.', image: s04, alt: 'Black-and-white photo of the founding congregation gathered with shovels at the ground breaking' },
  { date: '1954 – 1964', caption: 'The first permanent church buildings.', image: s05, alt: 'The first church building with its tall A-frame marker against a blue sky' },
  { date: '1954 – 1964', caption: 'For ten years, Sunday worship happened in Fellowship Hall.', image: s06, alt: 'Worshipers seated in rows inside Fellowship Hall' },
  { date: 'October 1962', caption: 'Olive Thompson, greeter.', image: s07, alt: 'Olive Thompson greeting men in suits at the church door in 1962' },
  { date: '1962', caption: 'Social hour after Sunday services. Some things never change.', image: s09, alt: 'Church members chatting in the doorway after a Sunday service in 1962' },
  { date: '1962', caption: 'Dr. Congdon and Mike Graham, Building Fund leader.', image: s10, alt: 'Dr. Congdon and Mike Graham seated at a desk in the church office' },
  { date: 'July 12, 1964', caption: 'Ground breaking for the new sanctuary.', image: s11, alt: 'A crowd gathers beneath the A-frame for the sanctuary ground breaking in 1964' },
  { date: 'October 1964', caption: 'Preparing the sanctuary foundation.', image: s12, alt: 'The cleared construction site for the sanctuary foundation' },
  { date: 'Fall 1964 – March 1965', caption: 'The sanctuary rises.', image: s14, alt: 'A “Northminster United Presbyterian Church” construction sign in front of the wooden sanctuary frame' },
  { date: 'Fall 1964 – March 1965', caption: 'Timber by timber, the distinctive tented roof takes shape.', image: s19, alt: 'The steep, tent-like wooden frame of the sanctuary under construction' },
  { date: 'March 1965', caption: 'Outside construction completed.', image: s25, alt: 'The finished mid-century sanctuary with its dark pyramidal roof' },
  { date: 'Spring 1965', caption: 'Stained glass and scaffolding: finishing the sanctuary interior.', image: s28, alt: 'Scaffolding inside the sanctuary with blue and red stained glass glowing above' },
  { date: 'April 3, 1965', caption: 'The Saturday before the first services in the new sanctuary.', image: s30, alt: 'Workers making final preparations inside the new sanctuary' },
  { date: 'April 4, 1965', caption: 'Dedication service in the new sanctuary. We’ve been worshiping here ever since.', image: s31, alt: 'Candlelit dedication service in the new sanctuary, 1965' },
];
