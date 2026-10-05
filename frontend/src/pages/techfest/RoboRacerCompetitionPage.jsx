/**
 * RoboRacerCompetitionPage — /techfest-iitbombay/robo-race-competition
 *
 * Target queries:
 *   • robo race competition 2026
 *   • robo racer
 *   • roboracer competition
 *   • robo race rules
 *   • iit bombay robo race
 *   • robo racer kit
 *
 * Interlinks to the Robo Racer kit PDP for ranking-signal flow.
 */
import CompetitionLandingLayout from './CompetitionLandingLayout';

const DATA = {
  slug: 'robo-race-competition',
  canonical: 'https://oll.co/techfest-iitbombay/robo-race-competition',
  breadcrumbLeaf: 'Robo Race Competition',
  title: 'Robo Race Competition 2026 — IIT Bombay Techfest | OLL Robotics Championship',
  h1: 'Robo Race Competition 2026 — Build. Code. Race. Win.',
  kicker: 'OLL × TechFest IIT Bombay · 2026-27',
  tagline: 'Build. Code. Race. Win.',
  heroLede:
    'The Robo Race competition at the OLL Robotics Championship 2026 — a wireless 1v1 head-to-head sprint on a 5 m straight track at Techfest, IIT Bombay. Build your own RC bot, qualify through the regional round and race for ₹1,50,000 at the Grand Finale on 17 Dec 2026.',
  metaDescription:
    'Robo Race competition 2026 at IIT Bombay Techfest — 1v1 RC robot sprint on a 5 m dual-lane track, free entry, regional qualifiers across India, Grand Finale 17 Dec 2026. Official rules, kit, prizes, judging rubric & registration.',
  keywords:
    'robo race, robo race competition, robo race competition 2026, roboracer, robo racer, robo race rules, robo race kit, iit bombay robo race, techfest robo race, rc robot race, school robotics competition india, oll techfest',
  heroImage: '/techfest/5.webp',
  heroImageAlt: 'OLL Robo Racer kit — official 2026 Techfest IIT Bombay edition',
  videoId: '5Egq4njczf4',

  stats: [
    { k: 'Track', v: '5 m · 2 lanes' },
    { k: 'Bot Size', v: '20 × 20 × 15 cm' },
    { k: 'Max Weight', v: '1.5 kg' },
    { k: 'Heat', v: '2 min · Knockout' },
  ],

  whyParticipate: [
    'Race your RC bot head-to-head on India\'s biggest school tech-fest arena — the Techfest, IIT Bombay main stage.',
    'Fully free entry — no registration fee across Round 1 (online), Round 2 (regional qualifier) or the Grand Finale.',
    'Prize pool of up to ₹1,50,000 split across the top 3 finalist teams, plus Certificate of Participation and Certificate of Finalist Recognition.',
    'Hands-on with real race engineering — ESP32-S3 wireless RC, tuned motor drivetrains, LiPo battery discharge rates, chassis aerodynamics and the official OLL 5 m dual-lane track.',
  ],

  rounds: [
    {
      k: 'Online Submission',
      when: 'Aug — Oct 2026',
      v: 'Register and submit a 60-second RC bot test video + a short design brief. Best teams per region clear the regional qualifier.',
    },
    {
      k: 'Regional Qualifier',
      when: 'East · IIT Kanpur · 24 Oct · South · RVU Bangalore · 26 Nov · West · IIT Bombay · 17 Dec',
      v: 'Live 1v1 heats on the OLL arena stage — bracket-style knockout, city by city. Winners punch their ticket to IIT Bombay.',
    },
    {
      k: 'Grand Finale',
      when: '17 Dec 2026 · IIT Bombay',
      v: 'Three days of head-to-head heats on the Techfest stage. Winners crowned live, prize money payouts via NEFT by May 2027.',
    },
  ],

  rules: [
    '1v1 heat between two bots in adjacent lanes, launched on the referee\'s signal.',
    'First bot to fully cross the finish line wins the heat.',
    'Dead heat or photo finish → immediate re-race between the same two bots.',
    'Fully wireless RC control only — one dedicated frequency/channel per team.',
    'Chassis, drivetrain and control logic must be the team\'s own build. Ready-made RC toy cars are not allowed.',
    'No obstruction, blocking, sharp parts or projectiles — single-lane discipline is strictly enforced.',
    'Bot envelope: 20 × 20 × 15 cm max. Weight: 1.5 kg max including battery.',
    'A 2 minute grace period is allowed to swap batteries or fix a non-functional bot before forfeit.',
  ],

  judging: [
    { k: 'Heat results (wins & lane discipline)', v: '55%', d: 'Head-to-head race outcomes across the regional qualifier and Grand Finale brackets.' },
    { k: 'Bot design & build quality', v: '20%', d: 'Chassis finish, wiring tidiness, driveline integrity, serviceability.' },
    { k: 'Drivetrain tuning', v: '15%', d: 'Gear ratio, tyre choice, battery discharge rate — how clean the launch and top-end are.' },
    { k: 'Team strategy & sportsmanship', v: '10%', d: 'Starting discipline, clean restarts, respect for the referee call.' },
  ],

  prizes: [
    { k: 'Winner', v: '₹75,000' },
    { k: 'Runner-up', v: '₹50,000' },
    { k: '2nd Runner-up', v: '₹25,000' },
  ],

  kit: {
    title: 'Robo Racer · Race-Ready Kit',
    slug: 'robo-racer-kit-specially-made-for-iit-bombay-8bf545dc',
    bullets: [
      'Aerodynamic, painted & branded RC chassis + castor wheel',
      '2 × tuned race motors with motor drivers + 2 × race wheels',
      'ESP32-S3 wireless controller',
      '1 × LiPo battery + Lipo charger',
      'Step-by-step build & code guide',
      '5 m dual-lane racing track — official 2026 ruleset',
    ],
  },

  faqs: [
    {
      q: 'What is the Robo Race competition at IIT Bombay Techfest 2026?',
      a: 'Robo Race (also written RoboRace or RoboRacer) is a 1v1 head-to-head RC robot sprint hosted by OLL inside the IIT Bombay Techfest 2026-27 championship. Teams build their own wireless RC bot that fits inside a 20 × 20 × 15 cm envelope and race down a 5 m dual-lane track. First bot to cross the finish line wins.',
    },
    {
      q: 'Is there a registration fee for Robo Race?',
      a: 'No. All three rounds — online submission, regional qualifier and the IIT Bombay Grand Finale — are completely free to enter. The only paid item is the optional (and strongly recommended) OLL Robo Racer kit.',
    },
    {
      q: 'Which grades can participate in Robo Race?',
      a: 'The Robo Race track is open to school teams from Grade 6 onward. Teams must have a school mentor and register via the official OLL Techfest form.',
    },
    {
      q: 'Do I need to buy the official OLL Robo Racer kit to compete?',
      a: 'The kit is strongly recommended but not mandatory. It is purpose-built for the 2026 ruleset — aerodynamic chassis, ESP32-S3 wireless, tuned race motors, LiPo battery and the official 5 m racing track — so teams that use it start several laps ahead on build day.',
    },
    {
      q: 'What are the Robo Race rules in short?',
      a: '1v1 bots in adjacent lanes on a 5 m straight track. First bot to fully cross the finish line wins. Wireless RC only, 20 × 20 × 15 cm envelope, 1.5 kg max weight, no blocking or sharp parts. Dead heats trigger an immediate re-race.',
    },
    {
      q: 'Where is the Robo Race Grand Finale held?',
      a: 'The Grand Finale is held live at Techfest, IIT Bombay on 17 December 2026. Winners are crowned on the main arena stage, with prize-money payouts via NEFT by May 2027.',
    },
  ],

  relatedBlogs: [
    {
      to: '/techfest-iitbombay/robo-sumo-competition',
      title: 'Robo Sumo Competition 2026 — 1v1 push-out battle',
      kicker: 'Sibling competition',
    },
    {
      to: '/blogs/how-to-build-robosumo-robot-iit-bombay-techfest',
      title: 'How to Build a Battle Robot — Full Step-by-Step Guide',
      kicker: 'Build guide',
    },
    {
      to: '/techfest-iitbombay/problem-statement',
      title: 'OLL × TechFest 2026 — Official Problem Statement',
      kicker: 'Rulebook',
    },
  ],
};

const RoboRacerCompetitionPage = () => <CompetitionLandingLayout data={DATA} />;
export default RoboRacerCompetitionPage;
