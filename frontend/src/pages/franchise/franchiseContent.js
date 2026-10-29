import {
  TrendingUp, Hand, Coins, Boxes, BadgeCheck, Cpu, BookOpen, GraduationCap, MonitorSmartphone,
  LifeBuoy, Trophy, Wrench, Camera, FileBarChart, ClipboardCheck, Laptop, Award, Medal,
  Ruler, MapPin, Plug, ShieldCheck, Paintbrush, Package, Sparkles, Megaphone, Layers,
  Bot, Code2, BrainCircuit, Box, Printer,
} from 'lucide-react';

export const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

const F = '/franchise';
export const IMG = {
  buildKid: `${F}/build-kid.webp`,
  heroKid: `${F}/hero-kid.webp`,
  thanksKid: `${F}/thanks-kid.webp`,
  ecoKids: `${F}/eco-kids.webp`,
  teacher: `${F}/teacher.webp`,
  marketing: `${F}/marketing.webp`,
  school: `${F}/school.webp`,
};

export const SKILL_CARDS = [
  { t: 'Robotics', i: Bot, img: `${F}/skill-0.webp` },
  { t: 'Coding', i: Code2, img: `${F}/skill-1.webp` },
  { t: 'AI', i: BrainCircuit, img: `${F}/skill-2.webp` },
  { t: '3D Design', i: Box, img: `${F}/skill-3.webp` },
  { t: '3D Printing', i: Printer, img: `${F}/skill-4.webp` },
];

export const WHY_START = [
  { i: TrendingUp, t: 'Growing Learning Category', s: 'Enter the future-skills education market.' },
  { i: Hand, t: 'Practical Learning', s: 'Give students hands-on experience with robotics kits, drones, 3D printing and AI projects.' },
  { i: Coins, t: 'Multiple Revenue Opportunities', s: 'Offer regular courses, holiday camps, workshops and school programs.' },
  { i: Boxes, t: 'Ready-to-Use Ecosystem', s: 'Start with equipment, learning resources, technology and operational guidance.' },
  { i: BadgeCheck, t: 'Brand & Business Support', s: "Access OLL's brand, training, systems and marketing support." },
];

export const DIFFERENT = [
  { i: Cpu, t: 'Equipment & Technology', s: 'Robotics kits, drones, AI resources, 3D printing and maker equipment.' },
  { i: BookOpen, t: 'Annual Curriculum', s: 'Structured, age-wise and project-based learning.' },
  { i: GraduationCap, t: 'Teacher Enablement', s: 'Training, teaching SOPs and classroom guidelines.' },
  { i: MonitorSmartphone, t: 'Digital Learning', s: 'LMS access, assessments and student progress tracking.' },
  { i: LifeBuoy, t: 'Academic Support', s: 'Learning resources, reports and ongoing guidance.' },
  { i: Trophy, t: 'Engagement', s: 'Student projects, certificates, competitions and showcases.' },
  { i: Wrench, t: 'Implementation Support', s: 'Operational guidance to help establish and run the program.' },
];

export const PARENT_VISIBILITY = [
  { i: Camera, t: 'Student project photographs and videos' },
  { i: FileBarChart, t: 'Progress reports' },
  { i: ClipboardCheck, t: 'Assessments' },
  { i: Laptop, t: 'LMS access' },
  { i: Award, t: 'Certificates and showcases' },
  { i: Medal, t: 'Competition participation and achievement stories' },
];

export const INCLUDED = [
  {
    key: 'equipment', i: Cpu, t: 'Robotics, AI & Maker Equipment', s: 'Build an exciting, hands-on learning environment with:',
    items: ['Beginner Robotics, AI & IoT kits', 'Intermediate robotics kits', '3D printer and filament', 'CNC laser cutting machine and MDF', '3D pens', 'Aeromodelling kits', 'Drone kits', 'AI Vision and Raspberry Pi kits', 'IoT and Smart Home kits', 'Mars Rover, Humanoid, Robotic Hand and Robotic Arm kits', 'Mechanical tools and electronics workstation', 'All-in-one PC'],
  },
  {
    key: 'setup', i: Sparkles, t: 'Premium Center Setup & Branding', s: 'Create a center that students are excited to walk into.',
    items: ['Pegboard and organized equipment displays', 'Acrylic station boards', 'OLL LED acrylic logo', 'Space-themed lighting and décor', 'Rocket and satellite models', 'Projector', 'Starlight Projector', 'OLL branding and marketing collateral'],
  },
  {
    key: 'curriculum', i: BookOpen, t: 'Curriculum & Educational Resources', s: 'Everything your educators need to teach from day one.',
    items: ['OLL hardcopy books', 'Structured learning resources', 'Student and teacher LMS access'],
  },
  {
    key: 'marketing', i: Megaphone, t: 'Marketing & Brand Assets', s: 'Look and sell like an established brand.',
    items: ['OLL branded blazer', 'Brochures for different age groups and course levels', 'Flyers and marketing resources', 'Framed OLL Authorized Center Certificate'],
  },
];

export const SERVICES = [
  { i: Layers, t: 'Curriculum & Academic Framework', items: ['Structured, age-wise, project-based curriculum', 'Five future skills: Robotics, Coding, AI, 3D Design and 3D Printing', 'Learning resources, assessments and academic framework'] },
  { i: GraduationCap, t: 'Teacher Enablement', items: ['Teacher qualification benchmarks', 'Structured teacher training', 'Step-by-step teaching SOPs and classroom guidelines', 'Curriculum and LMS orientation', 'Ongoing academic support and updates'] },
  { i: MonitorSmartphone, t: 'Digital Infrastructure', items: ['LMS access, student assessments and progress tracking', 'Digital learning resources and academic reporting, as applicable to the package', 'Website listing', 'Dedicated center landing page', 'Center management software access'] },
  { i: Package, t: 'Business & Operational Support', items: ['Center management SOP manuals', 'Inventory management guidance', 'Sales training for teachers and center managers', 'Lead generation support', 'Customer management and operational guidance'] },
  { i: Trophy, t: 'Student Engagement & Recognition', items: ['Student project showcases', 'Certificates and achievement opportunities', 'Competitions and innovation activities, as applicable'] },
];

export const OLL_PROVIDES = [
  'Curriculum, academic framework and learning resources',
  'Equipment and kits included in the agreed package',
  'Teacher training, teaching SOPs and academic guidance',
  'LMS and center management software access',
  'Branding materials and digital center presence',
  'Sales training, lead generation and customer management support, as agreed',
  'Implementation guidance and ongoing support as per the franchise agreement',
];

export const PARTNER_MANAGES = [
  'Providing suitable premises and completing the center infrastructure',
  'Recruiting and managing local educators and center staff',
  'Local admissions, parent communication and daily center operations',
];

export const SPACE = [
  { i: Ruler, t: 'Space & Capacity', items: ['Minimum recommended area: 300–500 sq. ft.', 'Dedicated space for Robotics, AI and STEM material storage and workstations for practical activities', 'Suitable for approximately 15–20 students, subject to layout and safety requirements'] },
  { i: MapPin, t: 'Accessibility', items: ['Easily accessible location within the city or neighborhood, convenient for students and parents', 'Preferably near residential communities, schools or educational hubs', 'Safe and convenient entry and exit'] },
  { i: Plug, t: 'Infrastructure', items: ['Proper flooring, walls and ceiling; adequate lighting and ventilation', 'Reliable electricity supply and sufficient plug points', 'High-speed internet connection', 'Air conditioning or suitable cooling, where required', 'Access to drinking water and washroom facilities'] },
  { i: ShieldCheck, t: 'Safety & Security', items: ['CCTV cameras and basic safety arrangements', 'Fire extinguisher and first-aid kit', 'Secure storage for robotics kits, tools and equipment', 'Safe electrical installations and adequate working space'] },
  { i: Paintbrush, t: 'Interior & Branding Potential', items: ['Wall space for OLL branding and learning displays', 'Display shelves for student projects and achievements', 'Scope to create dedicated Robotics, AI and maker stations'] },
];

export const TEACHERS = ['STEM education enthusiasts', 'Physics teachers', 'Computer science and computer teachers', 'Robotics and coding teachers', 'Science educators', 'Individuals passionate about technology, innovation and working with children'];

export const PARTNERS = ['Educators looking to become entrepreneurs', 'Existing coaching center and tuition owners looking to add a new vertical', 'School owners and education professionals', 'Individuals passionate about technology and education'];

export const STEPS = [
  { t: 'Apply', s: 'Share your details and preferred location.' },
  { t: 'Consultation', s: 'Discuss your business goals, market opportunity and franchise requirements with the OLL team.' },
  { t: 'Partnership Confirmation', s: 'Center planning: finalize the premises, sign the MOU and pay the upfront fees for infrastructure and setup requirements.' },
  { t: 'Onboarding — Setup & Training', s: 'Arrange the center, receive the agreed franchise deliverables and complete the required training and branding setup.' },
  { t: 'Launch', s: 'Begin admissions and introduce students to hands-on Robotics & AI learning.' },
];
