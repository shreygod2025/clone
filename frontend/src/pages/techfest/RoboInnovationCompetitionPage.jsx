/**
 * RoboInnovationCompetitionPage — /techfest-iitbombay/robo-innovation-competition
 *
 * Target queries:
 *   • robotics innovation challenge
 *   • robo innovation
 *   • robotics innovation challenge iit bombay
 *   • school robotics innovation competition
 *   • prototype pitch robotics
 */
import CompetitionLandingLayout from './CompetitionLandingLayout';

const DATA = {
  slug: 'robo-innovation-competition',
  canonical: 'https://oll.co/techfest-iitbombay/robo-innovation-competition',
  breadcrumbLeaf: 'Robo Innovation Competition',
  title: 'Robotics Innovation Challenge 2026 — IIT Bombay Techfest | OLL',
  h1: 'Robotics Innovation Challenge — Ideate. Prototype. Pitch.',
  kicker: 'OLL × TechFest IIT Bombay · 2026-27',
  tagline: 'Spot a real problem. Build a real solution.',
  heroLede:
    'The Robotics Innovation Challenge at the OLL Robotics Championship 2026 — a two-round prototype + pitch track at Techfest, IIT Bombay. Spot a real-world problem, design a robotics / AI / automation prototype to solve it and defend it live before a judging panel. No regionals — top prototypes head straight to the Grand Finale on 17 Dec 2026.',
  metaDescription:
    'Robotics Innovation Challenge 2026 at IIT Bombay Techfest — school teams design original robotics / AI / automation prototypes to solve real-world problems. Direct Grand Finale on 17 Dec 2026, free entry, prize pool up to ₹1,50,000.',
  keywords:
    'robotics innovation challenge, robo innovation, robo innovation competition, robotics innovation challenge iit bombay, prototype pitch, techfest innovation, school robotics innovation, stem innovation competition india, oll techfest',
  heroImage: '/techfest/7.webp',
  heroImageAlt: 'OLL × Techfest IIT Bombay Robotics Innovation Challenge',
  videoId: 'Px1kNkio0oY',

  stats: [
    { k: 'Format', v: 'Ideate · Prototype · Pitch' },
    { k: 'Rounds', v: '2 (Online + Finale)' },
    { k: 'Finale', v: 'IIT Bombay · 17 Dec 2026' },
    { k: 'Prize Pool', v: '₹1,50,000' },
  ],

  whyParticipate: [
    'Step out of head-to-head combat and compete on big thinking — judges look for ideas that could actually ship.',
    'No regional qualifier. Shortlisted teams fast-track directly to the Grand Finale at IIT Bombay — one submission, one pitch.',
    'Fully free entry, Certificate of Participation for every team and Certificate of Finalist Recognition for every finalist.',
    'Hardware freedom — unlike RoboSumo and RoboRacer there is no mandatory OLL kit. Build with whatever your team already has: Arduino, ESP32, Raspberry Pi, 3D-printed parts, LLMs, computer vision.',
  ],

  rounds: [
    {
      k: 'Online Prototype Submission',
      when: 'Aug — Nov 2026',
      v: 'Submit a 2-page concept note + a 90-second prototype video. Teams clearing the judging rubric are invited directly to the Grand Finale.',
    },
    {
      k: 'Grand Finale',
      when: '17 Dec 2026 · IIT Bombay',
      v: 'Live pitch defense in front of a judging panel at Techfest, IIT Bombay. Working prototype demonstration, Q&A, winners announced live.',
    },
  ],

  rules: [
    'Problem must be real and specific — rooted in a user, community or industry pain point your team has observed first-hand.',
    'Solution must be an original robotics / AI / automation prototype designed by the team. No off-the-shelf resellable products.',
    'Hardware is open — Arduino, ESP32, Raspberry Pi, Jetson Nano, LEGO SPIKE, 3D-printed parts, LLM APIs, computer vision stacks are all allowed.',
    'Team size: 2–4 students + one school mentor.',
    'Round 1 submission must include a concept note (≤2 pages) and a prototype video (60–90 s).',
    'Round 2 finalists must bring the physical prototype and demo it live during the pitch at IIT Bombay.',
    'Judging panel decision on originality, feasibility and real-world impact is final.',
  ],

  judging: [
    { k: 'Originality & Idea Quality', v: '20%', d: 'How novel and thoughtful is the problem framing and solution concept.' },
    { k: 'Technical rigour & working prototype', v: '30%', d: 'How robust, well-engineered and genuinely functional the prototype is on demo day.' },
    { k: 'Real-world impact & feasibility', v: '25%', d: 'Is this something that could realistically help the stated user — now or at scale.' },
    { k: 'Pitch, demo & defense', v: '15%', d: 'Clarity of pitch, prototype demo under live conditions, response to judge Q&A.' },
    { k: 'Team collaboration', v: '10%', d: 'Clear role distribution, mentorship model and how the team worked together across the build.' },
  ],

  prizes: [
    { k: 'Winner', v: '₹75,000' },
    { k: 'Runner-up', v: '₹50,000' },
    { k: '2nd Runner-up', v: '₹25,000' },
  ],

  kit: null,

  faqs: [
    {
      q: 'What is the Robotics Innovation Challenge at IIT Bombay Techfest 2026?',
      a: 'The Robotics Innovation Challenge is the open-ended track inside the OLL Robotics Championship 2026-27. Teams spot a real-world problem and design an original robotics, AI or automation prototype to solve it, then defend their build live at IIT Bombay. Unlike RoboSumo and RoboRacer there is no head-to-head arena match — judges score originality, technical rigour and real-world impact.',
    },
    {
      q: 'Is there a registration fee?',
      a: 'No. The Robotics Innovation Challenge is completely free across both rounds — online submission and the IIT Bombay Grand Finale.',
    },
    {
      q: 'Do I need the OLL kit to participate?',
      a: 'No. The Robotics Innovation Challenge is hardware-agnostic. Build with Arduino, ESP32, Raspberry Pi, Jetson, LEGO SPIKE, 3D-printed parts, LLM APIs, computer vision — anything your team can design around the problem.',
    },
    {
      q: 'Can I participate in Robo Sumo or Robo Race as well?',
      a: 'No. Each student can pick only one track — RoboSumo, RoboRacer or the Robotics Innovation Challenge. Choose the track that best matches your team\'s build strengths and interests.',
    },
    {
      q: 'What are the rounds for Robotics Innovation?',
      a: 'Two rounds. Round 1 is an online submission — a 2-page concept note plus a 60–90 second prototype video. Shortlisted teams head directly to the Grand Finale at IIT Bombay on 17 Dec 2026 for a live pitch + demo.',
    },
    {
      q: 'What are the prizes?',
      a: 'A prize pool of up to ₹1,50,000 is awarded across the top three teams — ₹75,000 Winner, ₹50,000 Runner-up, ₹25,000 Second Runner-up. Payouts are made via NEFT after winners submit their bank details on-site, with final payment by May 2027.',
    },
  ],

  relatedBlogs: [
    {
      to: '/techfest-iitbombay/robo-sumo-competition',
      title: 'Robo Sumo Competition 2026 — 1v1 push-out battle',
      kicker: 'Sibling competition',
    },
    {
      to: '/techfest-iitbombay/robo-race-competition',
      title: 'Robo Race Competition 2026 — 5m head-to-head RC race',
      kicker: 'Sibling competition',
    },
    {
      to: '/techfest-iitbombay/problem-statement',
      title: 'OLL × TechFest 2026 — Official Problem Statement',
      kicker: 'Rulebook',
    },
  ],
};

const RoboInnovationCompetitionPage = () => <CompetitionLandingLayout data={DATA} />;
export default RoboInnovationCompetitionPage;
