/**
 * RoboSumoCompetitionPage — /techfest-iitbombay/robo-sumo-competition
 *
 * Target queries:
 *   • robo sumo
 *   • robosumo
 *   • robo sumo competition
 *   • robo sumo competition 2026
 *   • robo sumo rules
 *   • robo sumo kit
 *   • iit bombay robo sumo
 *
 * This page exists specifically because Search Console shows "robo sumo" and
 * "robosumo" ranking at positions 4–7 without a dedicated landing page. The
 * Robo Sumo kit PDP already has 243 clicks / 20% CTR — we interlink here so
 * ranking signals flow between the two.
 */
import CompetitionLandingLayout from './CompetitionLandingLayout';

const DATA = {
  slug: 'robo-sumo-competition',
  canonical: 'https://oll.co/techfest-iitbombay/robo-sumo-competition',
  breadcrumbLeaf: 'Robo Sumo Competition',
  title: 'Robo Sumo Competition 2026 — IIT Bombay Techfest | OLL Robotics Championship',
  h1: 'Robo Sumo Competition 2026 — Build. Battle. Dominate.',
  kicker: 'OLL × TechFest IIT Bombay · 2026-27',
  tagline: 'Push. Grip. Dominate.',
  heroLede:
    'The Robo Sumo competition at the OLL Robotics Championship 2026 — a wireless 1v1 push-out battle live at Techfest, IIT Bombay. Build an autonomous sumo bot, enter the regional qualifier in your city and race for a prize pool of ₹1,50,000 at the Grand Finale.',
  metaDescription:
    'Robo Sumo competition 2026 at IIT Bombay Techfest — 1v1 autonomous sumo robot battle, free entry, regional qualifiers across India, Grand Finale on 17 Dec 2026. Official rules, kit, prizes, judging rubric & registration.',
  keywords:
    'robo sumo, robosumo, robo sumo competition, robo sumo competition 2026, robo sumo rules, robo sumo kit, iit bombay robo sumo, techfest robo sumo, robo sumo arena, 1v1 sumo robot, school robotics competition india, oll techfest',
  heroImage: '/techfest/1.webp',
  heroImageAlt: 'OLL Robo Sumo kit — official 2026 Techfest IIT Bombay edition',
  videoId: 'D5ngdbvLMC4',

  stats: [
    { k: 'Arena', v: '100 cm (1m) circular diameter' },
    { k: 'Bot Size', v: '25 × 25 × 25 cm' },
    { k: 'Max Weight', v: '3 kg' },
    { k: 'Match', v: '2 min · Knockout' },
  ],

  whyParticipate: [
    'Compete head-to-head on India\'s biggest school tech-fest stage — Techfest, IIT Bombay — in front of thousands of students and recruiters.',
    'Fully free entry — no registration fee for any of the three rounds. The only paid item is the optional (and strongly recommended) official OLL kit.',
    'Prize money of up to ₹1,50,000 split across the top 3 finalist teams, plus Certificate of Participation and Certificate of Finalist Recognition.',
    'Learn real embedded engineering — ESP32-S3 wireless control, high-torque Johnson 300 RPM motors, dual H-bridge motor drivers, LiPo battery safety and sheet-metal chassis design.',
  ],

  rounds: [
    {
      k: 'Online Submission',
      when: 'Aug — Oct 2026',
      v: 'Register your team and submit a short bot design brief + a 60-second build video. The best teams per region advance to Round 2.',
    },
    {
      k: 'Regional Qualifier',
      when: 'East · IIT Kanpur · 24 Oct · North · Modern Public School, Shalimar Bagh, Delhi · 21 Nov · South · RVCE College, Bangalore · 26 Nov · West · Venue & date TBA',
      v: 'Live 1v1 knockout brackets on the OLL arena stage — city by city. Winners get the golden ticket to IIT Bombay.',
    },
    {
      k: 'Grand Finale',
      when: '17 Dec 2026 · IIT Bombay',
      v: 'Three days on the iconic Techfest stage. Live knockout brackets, winners crowned live, prize money paid out by May 2027.',
    },
  ],

  rules: [
    '1v1 face-off with bots placed at opposite starting points on the 1 m circular ring.',
    'First bot pushed out of the ring loses; matches capped at 2 minutes.',
    '2 restart / sudden-death rounds if no elimination; referee decides on control & dominance if still tied.',
    'No weapons, sharp mechanisms, flipping mechanisms or projectiles.',
    'Bot must be the team\'s own original design — ready-made kits that come pre-assembled are not permitted.',
    'A 2-minute grace period is allowed to fix a non-functional bot before the referee calls a forfeit.',
    'Bot envelope: 25 × 25 × 25 cm max. Weight: 3 kg max including battery.',
    'Control: autonomous, wired or wireless RC — one dedicated channel per team.',
  ],

  judging: [
    { k: 'Match performance (push-outs & control)', v: '50%', d: 'Head-to-head results on the arena — wins, dominance and clean control.' },
    { k: 'Bot design & build quality', v: '25%', d: 'Chassis strength, wiring tidiness, wedge geometry, serviceability.' },
    { k: 'Weight distribution & traction', v: '15%', d: 'How grounded the bot stays under opposing push — tyre choice, counter-weighting.' },
    { k: 'Team strategy & sportsmanship', v: '10%', d: 'Tactics across rounds, respect for the referee, clean restarts.' },
  ],

  prizes: [
    { k: 'Winner', v: '₹75,000' },
    { k: 'Runner-up', v: '₹50,000' },
    { k: '2nd Runner-up', v: '₹25,000' },
  ],

  kit: {
    title: 'Robo Sumo · Battle-Ready Kit',
    slug: 'robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a',
    bullets: [
      'Pre-cut, pre-drilled 20 × 25 cm metal body (ready for the ring)',
      '2 × high-torque 300 RPM Johnson motors + 2 × high-power motor drivers',
      'ESP32-S3 wireless controller + 20 F-F wires',
      '1 × LiPo battery + Lipo charger (ergonomic, low-latency)',
      '25 W soldering iron + solder wire for in-team assembly',
      '150 × 150 cm high-contrast Sumo arena mat',
    ],
  },

  faqs: [
    {
      q: 'What is the Robo Sumo competition at IIT Bombay Techfest 2026?',
      a: 'Robo Sumo is a 1v1 autonomous sumo robot battle hosted by OLL inside the IIT Bombay Techfest 2026-27 championship. Teams build a wireless, autonomous sumo bot that fits inside a 25 × 25 × 25 cm envelope and weighs under 3 kg, and face off on a 1 m circular arena. The first bot pushed out of the ring loses.',
    },
    {
      q: 'Is there a registration fee for Robo Sumo?',
      a: 'No. The entire OLL Robotics Championship — including the Robo Sumo track across online submission, regional qualifier and the IIT Bombay Grand Finale — is completely free to enter. The only paid item is the optional (and strongly recommended) OLL Robo Sumo kit.',
    },
    {
      q: 'Which grades can participate in Robo Sumo?',
      a: 'The Robo Sumo competition is open to school teams from Grade 6 upward. Teams must have a school mentor and submit via the official OLL Techfest registration form.',
    },
    {
      q: 'Do I need to buy the official OLL Robo Sumo kit to compete?',
      a: 'The kit is strongly recommended but not mandatory. It is purpose-built for the 2026 ruleset — pre-cut metal body, 300 RPM Johnson motors, ESP32-S3 wireless controller, LiPo battery and the official 150 cm Sumo arena mat — so teams that use it start several steps ahead on the arena.',
    },
    {
      q: 'What are the Robo Sumo rules in short?',
      a: '1v1 bots on a 1 m circular arena. First bot pushed out of the ring loses. 2 minute matches with sudden-death rounds. 25 × 25 × 25 cm max envelope, 3 kg max weight, no weapons or flipping mechanisms. Autonomous, wired or wireless RC is allowed with one channel per team.',
    },
    {
      q: 'Where is the Robo Sumo Grand Finale held?',
      a: 'The Grand Finale is held live at Techfest, IIT Bombay on 17 December 2026 — three days of knockout brackets with winners crowned on the main arena stage.',
    },
  ],

  relatedBlogs: [
    {
      to: '/blogs/how-to-build-robosumo-robot-iit-bombay-techfest',
      title: 'How to Build a RoboSumo Robot — Full Step-by-Step Build Guide',
      kicker: 'Build guide',
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

const RoboSumoCompetitionPage = () => <CompetitionLandingLayout data={DATA} />;
export default RoboSumoCompetitionPage;
