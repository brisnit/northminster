/**
 * Plan Your Visit content — adapted from /sundays and /in-person-zoom-service-info.
 * Items marked `needsConfirmation` are sensible suggested copy that the
 * current site does NOT state. They render with a visible review marker
 * until Northminster confirms them (see src/config/flags.ts).
 */

export type Step = { time: string; title: string; body: string };

export const sundayFlow: Step[] = [
  { time: 'Before 10', title: 'Coffee & a donut', body: 'Grab a cup and say hello. Someone will be glad to point you toward the sanctuary.' },
  { time: '10:00', title: 'We sing', body: 'About ten minutes of contemporary worship music, led by our worship leader or band.' },
  { time: '10:10', title: 'We say hi', body: 'After songs and a prayer, there’s a moment to greet the people around you. Then a quick welcome and a couple of announcements.' },
  { time: '10:15', title: 'Kids head to class', body: 'Kids from preschool to 6th grade come up for a prayer together, then walk with their Sunday School teachers to class.' },
  { time: '10:20', title: 'We give & listen', body: 'One more song, the offering, and then the message — about 30 minutes, relatable for every age, grounded in Scripture.' },
  { time: '11:00', title: 'We linger', body: 'Stick around for coffee. On second Sundays, stay for the Second Sunday Café — a meal, fellowship and a bounce house.' },
];

export type Faq = { q: string; a: string; needsConfirmation?: boolean };

export const visitFaqs: Faq[] = [
  {
    q: 'What’s worship like?',
    a: 'A blend of contemporary and traditional. Some of us fondly remember robes and the organ; today you’ll hear a worship leader or band, familiar prayers, and teaching that connects Jesus to the world we actually live in.',
  },
  {
    q: 'How long is the service?',
    a: 'About an hour, 10:00 to 11:00 AM. The message itself is about 30 minutes.',
  },
  {
    q: 'What should I wear?',
    a: 'Whatever you’re comfortable in. You’ll see everything from jeans to Sunday best.',
    needsConfirmation: true,
  },
  {
    q: 'Where do I park?',
    a: 'We’re at 4324 Clairemont Mesa Blvd, between Genesee Ave. and Clairemont Dr., right next to O’Reilly Auto Parts.',
    needsConfirmation: true,
  },
  {
    q: 'Do I need to register or do anything before I come?',
    a: 'Nope. Just come. If you’d like someone to look out for you, send us a note and we’ll save you a seat.',
    needsConfirmation: true,
  },
  {
    q: 'What about communion?',
    a: 'We celebrate communion on the first Sunday of each month, right after the message. Kids come back from Sunday School to share it with us — including them matters to us.',
  },
  {
    q: 'Can I join online?',
    a: 'Yes. We gather live on Zoom every Sunday at 10 AM. For security, we don’t post the link publicly — email or call the church office and we’ll send it. Every service is also recorded and posted on our Messages page.',
  },
  {
    q: 'I have questions about faith. Is that okay?',
    a: 'More than okay. Whether you’ve been in church your whole life or never been at all, you’re welcome here — questions, doubts and all. Our pastor recently preached a whole message on honest doubt.',
  },
];

export const kidsOnSunday = {
  headline: 'Your kids are part of this church, too.',
  points: [
    { title: 'Ages 3 – 6th grade', body: 'Kids start in worship with their families, singing and getting to know the grown-ups in their church.' },
    { title: 'About 15 minutes in', body: 'They’re invited to meet their teacher and walk together to class, where trained volunteers lead a Bible story, a craft and interactive activities.' },
    { title: 'Walk them over', body: 'Want to see the classroom first? You’re welcome to walk your child to class and then come back to worship.' },
    { title: 'Infants & toddlers', body: 'Little ones are welcome with you in the pews, or in the seats in the library area.' },
    { title: 'Pick-up', body: 'After the service, pick your child up from the Youth room. On communion Sundays, kids rejoin the service for communion.' },
  ],
};
