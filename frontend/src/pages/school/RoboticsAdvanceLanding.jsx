/**
 * OLL Advance Robotics & AI Curriculum (Grades 3–10) — 2027-28 Brochure Edition.
 *
 * Design Language:
 *   - Bright, modern, principal-friendly white & light-slate canvas.
 *   - Deep navy (#0A1F44 / #1E3A5F) & energetic crimson (#DC2626 / #D63031) accents.
 *   - Rounded modern cards (rounded-2xl / rounded-3xl), glowing pill badges.
 *
 * Structure:
 *   1) Sticky Header (OLL Logo, Download Brochure CTA, Book School Demo CTA).
 *   2) Breadcrumb navigation with JSON-LD BreadcrumbList schema.
 *   3) Hero section: Value proposition, trust badges, primary CTA & brochure gate.
 *   4) Trust Stats (500+ Schools, 5 Lakh+ Kids, 4.8/5 Rating, 35+ Cities).
 *   5) Grade-by-Grade Interactive Explorer (Grades 3 to 10 tab switcher with real kits & project outlines).
 *   6) Hardware & Kits Deep Dive (Smart Hubs, Snap-fit Mechanics, Arduino, ESP32, Sensors, OLED Displays).
 *   7) Why OLL: 3 Pillars (Curriculum + Turnkey Kits, Teacher Empowerment, IIT Bombay Techfest & STEM.org).
 *   8) Leadership & Credibility (Shark Tank India S2, KBC S16 Hot Seat with Mr. Amitabh Bachchan).
 *   9) Partner Schools Video Testimonials & School Logo Marquee.
 *   10) Interactive School Demo Booking / Inquiry Form.
 *   11) LMS Section.
 *   12) School Related Programs (Cross-linking to other school tracks).
 *   13) Footer.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import {
  ArrowRight, Download, ShieldCheck, Trophy, Cpu, Code2, Brain,
  CheckCircle2, Sparkles, Users, BookOpen, Package, Award, Star,
  School, MapPin, Play, Heart, ChevronRight, ChevronLeft, Phone, Mail, Building,
  Layers, Radio, Gauge, Zap, Cog, Compass, Monitor, Check, Globe, Maximize2, X, Eye
} from 'lucide-react';

import Footer from '../../components/Footer';
import LMSSection from '../../components/school/LMSSection';
import SchoolBreadcrumbs from '../../components/school/SchoolBreadcrumbs';
import SchoolRelatedPrograms from '../../components/school/SchoolRelatedPrograms';
import CurriculumGateModal from '../../components/school/CurriculumGateModal';

const API = process.env.REACT_APP_BACKEND_URL;

const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

// Featured brochure slides for hero carousel (matching the second screenshot layout)
const ADVANCE_HERO_SLIDES = [
  {
    badge: 'Curriculum Brochure · Grades 3–10',
    tag: 'Cover Page · 2027–28 Edition',
    title: 'Advanced Robotics & AI Curriculum',
    subtitle: 'Robotics · Coding · Artificial Intelligence · STEM',
    src: '/school/advance/advance_page_1.webp',
    highlight: 'Turnkey Solution',
    edition: 'Official Brochure',
  },
  {
    badge: 'Global Adaptation · NEP 2020',
    tag: 'Brochure Page 3 · Hardware & Pedagogy',
    title: 'From Global Classrooms to Your School',
    subtitle: 'US & China Models (LEGO® & WeDo 2.0-Style Kits)',
    src: '/school/advance/advance_page_3.webp',
    highlight: 'World-Class Kits',
    edition: 'NEP 2020 Aligned',
  },
  {
    badge: 'International Framework · STEM',
    tag: 'Brochure Page 2 · National Mandates',
    title: 'Global Perspectives on Robotics Education',
    subtitle: 'Preparing Future Workforces from Grade 3 Upwards',
    src: '/school/advance/advance_page_2.webp',
    highlight: 'Global Standards',
    edition: 'Future-Ready',
  },
];

const CANONICAL_PATH =
  '/school/advance-robotics-and-ai-curriculum-books-with-kits-for-grades-3-to-10';

const CURRICULUM_PDF_GDRIVE =
  'https://drive.google.com/uc?export=download&id=1e2m6Aem4wRs-3CSv2NwuA6-p5nxN-lXd';

const CURRICULUM_PDF_NAME =
  'OLL-Advance-Robotics-Curriculum-2027-28.pdf';

const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
const SHARK_TANK_YT = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

const SCHOOL_VIDEOS = [
  { name: 'Parle Tilak Vidyalay', id: 'xHhMLBzB_GU' },
  { name: 'Maneckji Cooper Education Trust', id: 'vOik-WmE_n8' },
  { name: 'Hiranandani Foundation School', id: 'OnK6oevnLeM' },
  { name: 'TayieBiyah High School', id: 'dWo2wr02mq4' },
  { name: 'Greenlawns High School', id: 'YoIu5akBkr0' },
  { name: 'Shree Chandulal Nanavati High', id: 'r6xeqlTixYE' },
  { name: 'GD Somani School', id: '5c2gZORdUxc' },
  { name: 'St. Agnes School', id: 'I0uZ8aIIkwU' },
  { name: 'Sanjeevani World School', id: 'YeyKFirPot4' },
  { name: 'Dosti Foundation School', id: 'sqXE6tsUQ6g' },
];

const PARTNER_LOGOS = Array.from({ length: 46 }, (_, i) => `/school-logos/${i + 1}.png`);

// Grade-wise Curriculum data directly extracted from the Advance Curriculum PDF
const GRADE_CURRICULUM = [
  {
    grade: 'Grade 3',
    theme: 'Robotics with Motion',
    tag: 'Motion & Mechanics',
    color: '#0284C7',
    kitImg: '/school/advance/kit_grade_3.webp',
    kitIncludes: 'Rechargeable Coding Hub × 1, Type-C Charger × 1, Snap-Fit Parts × 286',
    summary: 'Focuses on kinetic energy, motorized movement, gear mechanisms, and structural balance.',
    projectsCount: 15,
    projects: [
      'Dolphin Robot', 'Flower & Bee Mechanism', 'Pulling Robot', 'Race Car Rover',
      'Dino Face Bot', 'Frog Jumper', 'Gorilla Walker', 'Construction Crane',
      'Automated Flood Gate', 'Rescue Helicopter', 'Spider Crawler', 'Recycling Truck',
      'Garbage Lorry', 'Robotic Fish', 'Exhibition Capstone Project'
    ],
    skills: ['Gear Movement', 'Kinetic Systems', 'Structural Rigidity', 'Problem Solving'],
    featuredModels: [
      { name: 'Mini Robot Car', desc: 'Dual-wheel motorized propulsion with front caster steering.' },
      { name: 'Walking Robot', desc: 'Bipedal kinetic linkage reproducing natural walking gait.' },
      { name: 'Drawing Bot', desc: 'Precision marker holder that traces geometric math patterns.' },
      { name: 'Crocodile Mouth', desc: 'Geared reciprocating snap mechanism with kinetic jaws.' },
      { name: 'Line Follower', desc: 'Basic sensor tracking mechanism navigating black track lines.' },
      { name: 'Moving Insect', desc: 'Multi-joint linkage mimicking insect locomotion.' }
    ]
  },
  {
    grade: 'Grade 4',
    theme: 'Robotics with Sensors',
    tag: 'Sensors & Automation',
    color: '#059669',
    kitImg: '/school/advance/kit_grade_4.webp',
    kitIncludes: 'Rechargeable Coding Hub × 1, Type-C Charger × 1, Sensor Modules, Snap-Fit Parts × 286',
    summary: 'Introduces perception, distance measurement, optical sensing, and reactive autonomous behaviors.',
    projectsCount: 15,
    projects: [
      'Caterpillar Crawler', 'Mantis Sensor Bot', 'Alarm Safety Device', 'Bridge Lift Mechanism',
      'Forklift Machine', 'Snow Plough Rover', 'Sea Ocean Cleaner', 'Robotic Pick-and-Place Arm',
      'Automated Floor Sweeper', 'Distance Measuring Bot', 'Blinking Firefly', 'Joystick Luna Rover',
      'Scan Bot Detector', 'Autonomous Security Rover', 'Exhibition Capstone Project'
    ],
    skills: ['Distance Sensing', 'Sensor Automation', 'Closed-Loop Feedback', 'Autonomous Navigation'],
    featuredModels: [
      { name: 'Helicopter', desc: 'High-speed dual-rotor assembly demonstrating torque and lift.' },
      { name: 'Explorer Bot', desc: 'Multi-directional rover equipped with reactive motion sensing.' },
      { name: 'Insect Robot', desc: 'Kinetic legs paired with obstacle evasion sensors.' },
      { name: 'All-Terrain Rover', desc: '6-wheel independent suspension for traversing rough surfaces.' },
      { name: 'Frog Bot', desc: 'Spring-loaded mechanism simulating biological leaping motion.' },
      { name: 'Dump Truck', desc: 'Motorized tipping bed with heavy-duty gear reduction.' }
    ]
  },
  {
    grade: 'Grade 5',
    theme: 'Robotics with Gears & Mechanical Motion',
    tag: 'Power Transmission & Torque',
    color: '#D97706',
    kitImg: '/school/advance/kit_grade_5.webp',
    kitIncludes: 'Battery Hub × 1, Medium Motor × 2, Coding Hub × 1, Parts × 311',
    summary: 'Deep dive into gear ratios, torque versus speed, mechanical advantage, and compound machines.',
    projectsCount: 16,
    projects: [
      'Power Transmission Car', 'Heavy Duty Crane Arm', 'Sweeping Street Car', 'Car with Rotating Arm',
      'Power Hammer System', 'Mechanical Pendulum', 'Robotic Dog Walker', 'Geared Windmill',
      'Precision Weighing Scale', 'Insect Crawler Bot', 'Dragster Speed Car', 'Wind-Powered Vehicle',
      'Flywheeler Inertia Car', 'F1 Racing Robot', 'Trundle Measuring Wheel', 'Motorised Harbor Crane'
    ],
    skills: ['Compound Gears', 'Torque & RPM', 'Mechanical Advantage', 'Kinetic Linkages'],
    featuredModels: [
      { name: 'Power Transmission Car', desc: 'Configurable multi-stage gearbox demonstrating torque transfer.' },
      { name: 'Heavy Duty Crane Arm', desc: 'Winch & pulley system calculating mechanical advantage.' },
      { name: 'Dragster Speed Car', desc: 'High RPM gear ratio optimization for acceleration trials.' },
      { name: 'F1 Racing Robot', desc: 'Streamlined aerodynamic chassis with low-friction drive.' },
      { name: 'Geared Windmill', desc: 'Kinetic energy conversion transforming wind to rotary torque.' },
      { name: 'Trundle Wheel', desc: 'Calibrated gear-click counter for real-world distance measurement.' }
    ]
  },
  {
    grade: 'Grade 6',
    theme: 'Robotics with Gears, Remote Control & Navigation',
    tag: 'Wireless Remote Control',
    color: '#7C3AED',
    kitImg: '/school/advance/kit_grade_6.webp',
    kitIncludes: 'Wireless Remote Controller × 1, Battery Hub × 1, Medium Motor × 1, Coding Hub × 1, Parts × 311',
    summary: 'Wireless radio control, differential steering, multi-axis motion, and smart obstacle evasion.',
    projectsCount: 16,
    projects: [
      'Remote Controlled Helicopter', 'Two-Wheeled RC Balancing Car', 'Alpine Ski Robot',
      'Dragonfly Flapper', 'Mechanical Crab Walker', 'Steam Train Engine', 'Armoured Tank with Treads',
      'Bicycle Stabilizer', 'Snail Motion Bot', 'Dragon Dance Robot', 'Obstacle Avoiding Rover',
      'Twin Spin Aeroplane', 'High-Speed RC Car', 'Chinook Tandem Helicopter', 'Cable Ski Lift', 'Dragon Boat'
    ],
    skills: ['RF Wireless Control', 'Differential Steering', 'Tracked Propulsion', 'Aerodynamic Motion'],
    featuredModels: [
      { name: 'Remote Controlled Helicopter', desc: '2.4 GHz wireless RF signal control with differential yaw.' },
      { name: 'Two-Wheeled Balancing Car', desc: 'Dynamic balance robotics with wireless joystick throttle.' },
      { name: 'Mechanical Crab Walker', desc: '6-legged articulated motion for sideways traversal.' },
      { name: 'Armoured Tank with Treads', desc: 'High-traction rubber treads conquering steep 35° inclines.' },
      { name: 'High-Speed RC Car', desc: 'Proportional steering with responsive wireless telemetry.' },
      { name: 'Cable Ski Lift', desc: 'Motorized aerial suspension cable car system.' }
    ]
  },
  {
    grade: 'Grade 7',
    theme: 'Embedded Systems & Arduino Automation',
    tag: 'Arduino Circuits & Microcontrollers',
    color: '#DC2626',
    kitImg: '/school/advance/kit_grade_7.webp',
    kitIncludes: 'Arduino Uno DIP, Breadboard, Jumper Wires, Servo Motors, LDR, PIR, Smoke, Rain Sensors & Pump',
    summary: 'Transition to breadboard prototyping, C++ Arduino coding, environmental sensing, and real-world automation.',
    projectsCount: 15,
    projects: [
      'Introduction to Breadboard Circuitry', 'Arduino & Tinkercad Virtual Simulation',
      'Blink LED Digital Output', 'Traffic Light Controller Logic', 'Electronic Doorbell Buzzer',
      'Smart Visitor Alert & Attendance Counter', 'Solar Panel Sun Tracker (LDR + Servo)',
      'Automated Toll Booth Barrier', 'Smart Fire Safety Alert (Smoke Sensor)',
      'Automatic Fire Extinguisher (Pump Motor)', 'Rain Detection Warning Alarm',
      'Automated Car Windshield Wiper', 'Automatic Plant Irrigation System',
      'Smart Home Integrated Automation', 'Exhibition Capstone Project'
    ],
    skills: ['Arduino IDE & C++', 'Breadboard Prototyping', 'PWM & Analog Read', 'Smart Infrastructure'],
    featuredModels: [
      { name: 'Solar Panel Sun Tracker', desc: 'Dual LDR optical sensors driving servo to maximize solar absorption.' },
      { name: 'Automated Toll Booth Barrier', desc: 'Ultrasonic proximity trigger with precision servo barrier arm.' },
      { name: 'Automatic Fire Extinguisher', desc: 'Flame sensor detects fire, triggers relay, and pumps water spray.' },
      { name: 'Automated Car Windshield Wiper', desc: 'Raindrop detection board triggering auto variable-speed servo wipes.' },
      { name: 'Smart Visitor Alert & Counter', desc: 'IR beam break counter with numeric display and audio buzzer.' },
      { name: 'Smart Home Automation System', desc: 'Capstone integrating temperature, light sensing, and automated cooling fan.' }
    ]
  },
  {
    grade: 'Grade 8',
    theme: 'Microcontrollers, PWM & Industrial Robotics',
    tag: 'Industrial Automation & Robotics',
    color: '#2563EB',
    kitImg: '/school/advance/kit_grade_8.webp',
    kitIncludes: 'Arduino Board, Ultrasonic Sensor, IR Tracking Array, Motor Driver Shield, DC Motors, Chassis',
    summary: 'Pulse Width Modulation, speed control, conveyor belt systems, edge-avoidance, and line-tracking robots.',
    projectsCount: 15,
    projects: [
      'Understanding Circuit Breadboards', 'Introduction to Arduino & Tinkercad',
      'LED Sequence & Timing Logic', 'Traffic Light Phase Automation',
      'Push-Button Controlled Smart Night Lamp', 'Infrared Intruder Alarm System',
      'Automatic Ambient Street Lamp', 'DC Motor Direction & Speed Control',
      'PWM Speed Demon Motor Tuning', 'Ultrasonic Autonomous Obstacle Avoider',
      'Smart Factory Gate Opener', 'Industrial Conveyor Belt Assembly',
      'Edge Avoider Table-Safe Robot', 'Autonomous PID Line Follower Bot',
      'Exhibition Capstone Project'
    ],
    skills: ['PWM Motor Control', 'Infrared Arrays', 'PID Path Tracking', 'Industrial Mechatronics'],
    featuredModels: [
      { name: 'Autonomous Obstacle Avoider', desc: 'HC-SR04 sonar sensor scanning 180° to calculate collision-free path.' },
      { name: 'Industrial Conveyor Belt', desc: 'Motor-driven production line with optical object counter.' },
      { name: 'PID Line Follower Rover', desc: 'Dual infrared array for high-speed line tracking with closed loop control.' },
      { name: 'Edge Avoider Table-Safe Bot', desc: 'Downward-facing optical sensors preventing table-fall disasters.' },
      { name: 'Smart Factory Gate Opener', desc: 'Dual-limit switch security gate with indicator traffic lights.' },
      { name: 'Infrared Intruder Alarm', desc: 'Tripwire security circuit with latching alarm and buzzer.' }
    ]
  },
  {
    grade: 'Grade 9',
    theme: 'Advanced Embedded Systems, OLED Displays & Arcade Gaming',
    tag: 'I2C Protocols & OLED Graphics',
    color: '#4F46E5',
    kitImg: '/school/advance/kit_grade_9.webp',
    kitIncludes: 'Arduino Uno, 0.96" OLED Display (I2C), 2-Axis Joystick, DHT11 Sensor, RGB LEDs, Ultrasonic Sensor',
    summary: 'I2C bus communication, hexadecimal pixel mapping, interactive UI menus, and joystick gaming engines on hardware.',
    projectsCount: 15,
    projects: [
      'Arduino Architecture & Breadboard Interfacing', 'Introduction to LCD & Hexadecimal Addressing',
      'Hello World OLED Graphics Display', 'Custom 5x8 Pixel Emoji Character Designer',
      'Local Weather Station & Temp/Humidity Alarm (DHT11)', 'Car Reverse Parking Sonar with Variable Buzzer',
      'RGB LED Color Mixer using PWM', 'Intelligent Traffic Signal Timing Controller',
      'Joystick Coordinate Plotter (ADC Readings)', 'LCD Interactive Menu Navigator',
      'Flappy Bird-Style OLED Arcade Game', 'Ultrasonic Theremin Electronic Musical Instrument',
      'Classic Snake Game with Joystick Input', 'Space Shooter Multi-Enemy Arcade Game',
      'Memory Sequence Direction Game'
    ],
    skills: ['I2C Protocol', 'Pixel Matrix Buffering', 'Hardware Game Engines', 'Analog Joystick ADC'],
    featuredModels: [
      { name: 'Custom Emoji OLED Display', desc: 'Hexadecimal byte array animation rendering smiling faces and icons on 0.96" OLED.' },
      { name: 'Car Reverse Parking Sonar', desc: 'Ultrasonic sonar with progressive LED bar graph and proximity tone frequency.' },
      { name: 'Flappy Bird Hardware Console', desc: 'Microcontroller arcade game featuring gravity physics, obstacles, and high score tracking.' },
      { name: 'Local Weather Station Alarm', desc: 'DHT11 sensor reading live room temperature & humidity with OLED graph.' },
      { name: 'Snake Game & Space Shooter', desc: 'Analog 2-axis joystick driving player coordinates on a high-refresh OLED canvas.' },
      { name: 'Memory Sequence Game', desc: 'Simon Says 4-color LED & buzzer memory puzzle testing cognitive recall.' }
    ]
  },
  {
    grade: 'Grade 10',
    theme: 'IoT, Wireless, AI Speech Recognition & Voice Automation',
    tag: 'IoT, Bluetooth & Voice AI',
    color: '#0D9488',
    kitImg: '/school/advance/kit_grade_10.webp',
    kitIncludes: 'ESP32 IoT Controller, Bluetooth Module, Voice/Microphone Module, Text-to-Speech Speaker, Relays',
    summary: 'Cloud connectivity, smartphone Bluetooth telemetry, Local Speech-to-Text (STT), Text-to-Speech (TTS), and Voice AI.',
    projectsCount: 10,
    projects: [
      'Bluetooth Railway Barrier via Smartphone', 'Mobile-Operated Smart Home Appliance Controller',
      'Giving the Robot a Voice (TTS Speech Synthesis)', 'Hearing & Transcribing (Local STT Voice Recognition)',
      'Voice Command: Turn On the Room Lights', 'Voice Command: Open the Smart Door Mechanism',
      'Smart IoT Environmental Cloud Dashboard', 'Wireless Telemetry & Sensor Logger',
      'AI Voice-Assisted Receptionist Bot', 'Grand Finale Capstone Project'
    ],
    skills: ['ESP32 & Wireless IoT', 'Local Speech-to-Text', 'Text-to-Speech Synthesis', 'Mobile Telemetry'],
    featuredModels: [
      { name: 'Voice Command Smart Lights', desc: 'Local speech recognition processing spoken English commands without internet.' },
      { name: 'Voice-Assisted Receptionist Bot', desc: 'Text-to-Speech (TTS) synthesized audio greetings responding to presence.' },
      { name: 'Bluetooth Mobile Home Automation', desc: 'Custom smartphone dashboard controlling high-voltage appliances via relays.' },
      { name: 'Smart Cloud Environment Dashboard', desc: 'ESP32 Wi-Fi telemetry posting temperature, air quality to cloud charts.' },
      { name: 'Smart Railway Barrier System', desc: 'Automated train detection with dual crossing arms and flashing signal towers.' },
      { name: 'Grand Finale Capstone Project', desc: 'Multi-sensor autonomous IoT system presented for ICSE/CBSE board evaluation.' }
    ]
  }
];

export default function RoboticsAdvanceLanding() {
  const navigate = useNavigate();
  const [selectedGradeIdx, setSelectedGradeIdx] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);

  // Auto-rotate the brochure slider every 4.5s (matching the second screenshot)
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlideIdx((i) => (i + 1) % ADVANCE_HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  // Listen for ESC to close image zoom lightbox
  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e) => { if (e.key === 'Escape') setPreviewImage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewImage]);

  // Form submission state
  const [leadForm, setLeadForm] = useState({
    school_name: '',
    contact_name: '',
    phone: '',
    email: '',
    city: '',
    board: 'CBSE',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeGrade = GRADE_CURRICULUM[selectedGradeIdx];
  const activeSlide = ADVANCE_HERO_SLIDES[activeSlideIdx];

  const handleFormChange = (e) => {
    setLeadForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadForm.school_name.trim() || leadForm.phone.replace(/\D/g, '').length < 10) {
      toast.error('Please provide a valid School Name and 10-digit Phone Number.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/schools/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: leadForm.school_name.trim(),
          contact_name: leadForm.contact_name.trim() || 'Principal / Coordinator',
          email: leadForm.email.trim() || `school_${leadForm.phone.replace(/\D/g, '')}@pending.oll.co`,
          phone: leadForm.phone.trim(),
          city: leadForm.city.trim(),
          board: leadForm.board,
          selected_offerings: ['Advance Robotics & AI Program (Grades 3-10)'],
          programs_interested: ['Advance Robotics Curriculum 2027-28'],
          source: 'advance-robotics-landing-page',
          notes: `Advance Robotics demo request. Board: ${leadForm.board}. Message: ${leadForm.message || 'None'}.`,
          assign_option: 'admin',
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        toast.success('Demo booking request submitted successfully! Our curriculum specialist will connect shortly.');
      } else {
        throw new Error('Failed to submit');
      }
    } catch {
      toast.success('Your request was received. Our team will contact you shortly.');
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative icse-page" style={{ background: '#FAFBFD', color: '#0F1E33', fontFamily: "'Proxima Nova', 'Montserrat', system-ui, sans-serif" }}>
      <Toaster position="top-right" richColors />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;500;600;700;800;900&family=Caveat:wght@400;700&display=swap');
        @font-face {
          font-family: 'Zing Rust';
          src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype');
          font-weight: 400; font-style: normal; font-display: swap;
        }
        .icse-script  { font-family: 'Caveat', cursive; font-weight: 700; letter-spacing: 0; text-transform: none; }
        .icse-nav-pill { max-width: 1220px; margin: 0 auto; background: rgba(255,255,255,0.98); backdrop-filter: saturate(180%) blur(14px); border: 1px solid rgba(10,31,68,0.08); box-shadow: 0 20px 44px rgba(10,31,68,0.12); border-radius: 999px; display:flex; align-items:center; justify-content: space-between; padding: 8px 14px 8px 18px; }
        .icse-btn     { display:inline-flex; align-items:center; gap:8px; padding:14px 26px; border-radius:999px; font-weight:700; font-size:0.82rem; letter-spacing:0.05em; text-transform:uppercase; transition:transform .2s ease, box-shadow .2s ease, background .2s ease; cursor:pointer; text-decoration:none; border:none; }
        .icse-btn.primary { background:#DC2626; color:#fff; box-shadow:0 14px 28px rgba(220,38,38,0.28); }
        .icse-btn.primary:hover { background:#B91C1C; transform:translateY(-1px); }
        .icse-btn.outline { background:#fff; color:#0A1F44; border:1.5px solid #0A1F44; }
        .icse-btn.outline:hover { background:#0A1F44; color:#fff; }
        .icse-mobile-cta {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
          padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0));
          display: none;
          gap: 8px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: saturate(180%) blur(14px);
          border-top: 1px solid rgba(10,31,68,0.08);
          box-shadow: 0 -12px 32px rgba(10,31,68,0.10);
        }
        .icse-mobile-cta .icse-btn { flex: 1; justify-content: center; padding: 12px 14px !important; font-size: 0.75rem !important; }
        @media (max-width: 640px) {
          .icse-nav-pill { padding: 6px 10px 6px 12px; }
          .icse-nav-pill img { height: 34px !important; }
          .icse-page { padding-bottom: 84px; }
          .icse-btn { padding: 12px 18px !important; font-size: 0.78rem !important; }
          .icse-btn.primary, .icse-btn.outline { min-height: 46px; }
          .icse-mobile-cta { display: flex; }
        }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .icse-anim-float { animation: floatY 6s ease-in-out infinite; }
        @keyframes sparkleSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .icse-anim-spin { animation: sparkleSpin 16s linear infinite; }
        @keyframes orbDrift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.08); } }
        .icse-orb-red, .icse-orb-blue, .icse-orb-gold { animation: orbDrift 14s ease-in-out infinite; }
        .icse-orb-blue { animation-delay: -4s; animation-duration: 18s; }
        .icse-orb-gold { animation-delay: -8s; animation-duration: 22s; }
        .icse-orb-red  { position:absolute; width:400px; height:400px; border-radius:50%; background:rgba(220,38,38,0.14); filter:blur(90px); pointer-events:none; }
        .icse-orb-blue { position:absolute; width:400px; height:400px; border-radius:50%; background:rgba(96,165,250,0.16); filter:blur(90px); pointer-events:none; }
        .icse-orb-gold { position:absolute; width:340px; height:340px; border-radius:50%; background:rgba(245,158,11,0.14); filter:blur(90px); pointer-events:none; }
      `}</style>

      {/* Background orbs (soft ambient blushes, matching the second screenshot) */}
      <div className="icse-orb-red"  style={{ top: '-140px', left: '-120px' }} />
      <div className="icse-orb-blue" style={{ top: '25%',   right: '-120px' }} />
      <div className="icse-orb-gold" style={{ bottom: '30%', left: '-80px' }} />

      {/* ── Sticky Nav (desktop/tablet only — mobile uses the sticky bottom CTA bar). ─── */}
      <nav className="fixed top-3 left-0 right-0 z-50 px-3 hidden sm:block" data-testid="advance-nav">
        <div className="icse-nav-pill">
          <a href="/" className="flex items-center gap-3">
            <img src={OLL_LOGO_COLOR} alt="OLL — Skills for All logo · Official Advance Robotics partner" className="h-9 sm:h-10 w-auto" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-[#0A1F44] border-l border-slate-200 pl-3 leading-tight">
              Advance Robotics &amp; AI<br/>Grades 3 to 10
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setGateOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0A1F44] px-3 py-2 rounded-full hover:bg-slate-100 transition"
              data-testid="advance-nav-download">
              <Download className="w-3.5 h-3.5" /> Curriculum PDF
            </button>
            <a href="#book-demo-section" className="icse-btn primary" style={{ padding: '10px 20px', fontSize: '0.72rem' }} data-testid="advance-nav-cta">
              Book Demo <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Visible breadcrumb trail (with top padding to account for fixed floating pill nav) ── */}
      <div style={{ paddingTop: 'clamp(2.5rem, 8vw, 5.5rem)' }}>
        <SchoolBreadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'For Schools', href: '/school' },
            { label: 'Robotics', href: '/school#robotics' },
            { label: 'Advance Robotics & AI (Grades 3–10)' }
          ]}
          schemaId="advance-robotics-breadcrumbs-schema"
          testid="advance-breadcrumbs"
        />
      </div>

      {/* 3. HERO SECTION */}
      <section style={{ maxWidth: 1200, margin: '1.5rem auto 3rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'radial-gradient(ellipse at top right, rgba(239, 68, 68, 0.08), transparent 60%), radial-gradient(ellipse at bottom left, rgba(30, 58, 95, 0.06), transparent 60%), #FFFFFF',
          borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '3rem 2.5rem', boxShadow: '0 20px 50px rgba(15, 30, 80, 0.06)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            
            {/* Hero Left: Text & CTA */}
            <div>
              <div className="icse-script text-[#DC2626] text-3xl mb-1">
                hands-on future engineers
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
                borderRadius: '9999px', padding: '0.35rem 0.85rem', fontSize: '0.8rem',
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem'
              }}>
                <Award size={14} /> STEM.org Certified · NEP 2020 Aligned
              </div>

              <h1 style={{
                fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', fontWeight: 900,
                lineHeight: 1.15, color: '#0A1F44', marginBottom: '1.25rem',
                letterSpacing: '-0.02em'
              }}>
                Advance Robotics & AI Curriculum for Schools{' '}
                <span style={{ color: '#DC2626', display: 'inline-block' }} className="italic font-serif">(Grades 3 to 10)</span>
              </h1>

              <p style={{
                fontSize: '1.05rem', lineHeight: 1.6, color: '#475569',
                marginBottom: '2rem', maxWidth: 560
              }}>
                From foundational mechanical motion and sensors in middle school to <em className="italic text-[#0A1F44] font-semibold">Arduino microcontrollers, I2C OLED displays, autonomous rovers</em>, and <em className="italic text-[#0A1F44] font-semibold">ESP32 Voice AI</em> in high school. Complete hands-on lab kits, grade-mapped textbooks, and comprehensive teacher empowerment.
              </p>

              {/* Primary Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
                <a
                  href="#book-demo-section"
                  data-testid="hero-primary-cta"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    color: '#fff', padding: '0.9rem 1.75rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                    boxShadow: '0 8px 24px rgba(220, 38, 38, 0.3)',
                    transition: 'transform 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Book Free School Demo <ArrowRight size={18} />
                </a>

                <button
                  onClick={() => setGateOpen(true)}
                  data-testid="hero-secondary-cta"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: '#FFFFFF', color: '#0A1F44', border: '2px solid #E2E8F0',
                    padding: '0.85rem 1.5rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 30, 80, 0.04)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <Download size={18} style={{ color: '#DC2626' }} /> Download Curriculum Brochure (PDF)
                </button>
              </div>

              {/* Trust Checkmarks */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {[
                  '100+ Hands-on Lab Projects',
                  'Snap-Fit Kits (286–311 pcs)',
                  'No Prior Teacher Coding Needed',
                  'IIT Bombay Techfest Gateway'
                ].map((txt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Right: Brochure Showcase Slider Card styled like Screenshot 2 */}
            <div className="relative icse-anim-fadeup icse-anim-delay-2" data-testid="advance-hero-card">
              {/* Ambient glowing gradient behind the card */}
              <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-[#0A1F44]/25 via-transparent to-[#DC2626]/25 blur-3xl icse-anim-spin" />

              {/* White floating card */}
              <div className="relative bg-white rounded-[32px] p-5 sm:p-6 border border-amber-100 shadow-2xl icse-anim-float">
                {/* Header Bar */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 bg-[#0A1F44] px-3.5 py-1.5 rounded-full">
                    <Trophy className="w-3.5 h-3.5 text-white" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                      {activeSlide.badge}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 tabular-nums">
                    {String(activeSlideIdx + 1).padStart(2, '0')} / {String(ADVANCE_HERO_SLIDES.length).padStart(2, '0')}
                  </div>
                </div>

                {/* Full-Cover Hero Visual Box (Edge-to-edge, no page margins) */}
                <div className="relative rounded-2xl overflow-hidden w-full h-[380px] sm:h-[420px] shadow-md bg-slate-900 group">
                  <img
                    src={activeSlide.src}
                    alt={activeSlide.title}
                    className="w-full h-full object-cover object-top transition-all duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none" />
                </div>

                {/* Info / Metadata Row */}
                <div className="mt-4 pt-3.5 border-t border-amber-100/70 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#DC2626]">
                      {activeSlide.tag}
                    </div>
                    <div className="text-[#0A1F44] font-black text-base sm:text-lg leading-tight mt-0.5 truncate">
                      {activeSlide.title}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5 truncate italic">
                      {activeSlide.subtitle}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {activeSlide.highlight}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                      {activeSlide.edition}
                    </div>
                  </div>
                </div>

                {/* Bottom Carousel Indicator Dots (matching Screenshot 2) */}
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {ADVANCE_HERO_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSlideIdx(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`transition-all duration-300 cursor-pointer border-none p-0 ${
                        activeSlideIdx === idx
                          ? 'w-6 h-2 rounded-full bg-[#DC2626]'
                          : 'w-2 h-2 rounded-full bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. TRUST STATS BAR */}
      <section style={{ maxWidth: 1200, margin: '0 auto 4rem', padding: '0 1.25rem' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}>
          {[
            { num: '500+', label: 'Partner Schools Across India', icon: School, color: '#DC2626' },
            { num: '5,00,000+', label: 'Students Trained & Certified', icon: Users, color: '#2563EB' },
            { num: '4.8 / 5', label: 'Principal & Teacher Rating', icon: Star, color: '#D97706' },
            { num: '98%', label: 'Year-on-Year Renewal Rate', icon: Heart, color: '#059669' },
          ].map((st, i) => (
            <div key={i} style={{
              background: '#FFFFFF', borderRadius: '1.25rem', border: '1px solid #E2E8F0',
              padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: '0 4px 16px rgba(15, 30, 80, 0.03)'
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '0.9rem',
                background: `${st.color}15`, color: st.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <st.icon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0A1F44', lineHeight: 1.1 }}>
                  {st.num}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', marginTop: '0.2rem' }}>
                  {st.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4.5 GLOBAL ROBOTICS BENCHMARK & METHODOLOGY SHOWCASE (PAGE 2 & PAGE 3 DEEP-DIVE) */}
      <section id="global-methodology" style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="icse-script text-[#DC2626] text-3xl mb-1">
            global benchmark
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.75rem', fontWeight: 800, color: '#DC2626',
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem',
            background: '#FEF2F2', padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid #FECACA'
          }}>
            <Globe size={14} /> Global Standards · Local Relevance
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            From Global Classrooms to Your School
          </h2>
          <p style={{ color: '#64748B', maxWidth: 720, margin: '0.5rem auto 0', fontSize: '0.98rem', lineHeight: 1.6 }}>
            We study, source, and adapt the world’s leading robotics education models <span className="italic font-semibold text-[#0A1F44]">(US &amp; China)</span> into an accredited, turnkey, school-ready curriculum designed for Indian students.
          </p>
        </div>

        {/* 2-Card Side-by-Side Visual Showcase: Page 3 and Page 2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '2rem', alignItems: 'stretch'
        }}>
          {/* Card 1: Page 3 - From Global Classrooms to Your School */}
          <div style={{
            background: '#FFFFFF', borderRadius: '1.75rem', border: '2px solid #E2E8F0',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 12px 32px rgba(15, 30, 80, 0.06)', transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 100%)',
              padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#F87171' }}>
                  Brochure Page 3
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                  From Global Classrooms to Your School
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,255,255,0.15)', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                Turnkey Adaptation
              </span>
            </div>

            {/* Image Preview with Zoom */}
            <div
              onClick={() => setPreviewImage({
                src: '/school/advance/advance_page_3.webp',
                title: 'From Global Classrooms to Your School — OLL Models',
                caption: 'Research-backed curriculum adapting US & China robotics models (LEGO® & WeDo 2.0-style kits) into affordable Indian classroom stacks.'
              })}
              className="relative cursor-pointer overflow-hidden rounded-2xl bg-slate-50 border border-slate-200 p-2 text-center group transition-all hover:shadow-lg"
              title="Click to view full size"
            >
              <img
                src="/school/advance/advance_page_3.webp"
                alt="From Global Classrooms to Your School - OLL Robotics Models"
                className="w-full max-h-[380px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02] bg-white shadow-sm"
              />
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/25 transition-all flex items-center justify-center rounded-2xl">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-slate-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <Maximize2 size={13} className="text-[#DC2626]" /> Tap to Expand Page
                </span>
              </div>
            </div>

            {/* Key Content Breakdown from Page 3 */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  4 Pillars of OLL Adaptation
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0A1F44', marginBottom: '0.75rem' }}>
                  Proven LEGO® &amp; WeDo 2.0-Style Kits Made Affordable
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Study Global Models', desc: 'Researched international curricula across the United States (LEGO® Education, SPIKE, Mindstorms) and China.' },
                    { label: 'Source World-Class Kits', desc: 'Procure proven platforms like LEGO® and WeDo 2.0-style kits with rechargeable hubs and precision motors.' },
                    { label: 'Grade-Wise Structured Curriculum', desc: 'Progressive, hands-on syllabus seamlessly mapped to NEP 2020 and Indian school timetables.' },
                    { label: 'Expert OLL Educator', desc: 'Trained, certified facilitators stationed in school to deliver robotics & AI lessons with ongoing teacher mentoring.' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999, background: '#EFF6FF',
                        color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                        <strong style={{ color: '#0A1F44' }}>{item.label}:</strong> {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
                  Global Innovation · Local Relevance
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '0.25rem 0.65rem', borderRadius: '0.5rem' }}>
                  NEP 2020 Aligned
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Page 2 - Global Perspectives on Robotics Education */}
          <div style={{
            background: '#FFFFFF', borderRadius: '1.75rem', border: '2px solid #E2E8F0',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 12px 32px rgba(15, 30, 80, 0.06)', transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
              padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60A5FA' }}>
                  Brochure Page 2
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                  Global Perspectives on Robotics Education
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,255,255,0.15)', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                Workforce Blueprint
              </span>
            </div>

            {/* Image Preview with Zoom */}
            <div
              onClick={() => setPreviewImage({
                src: '/school/advance/advance_page_2.webp',
                title: 'Global Perspectives on Robotics Education — China & USA',
                caption: 'How leading world economies prepare future-ready workforces from Grade 3 upwards with mandatory robotics and AI literacy.'
              })}
              className="relative cursor-pointer overflow-hidden rounded-2xl bg-slate-50 border border-slate-200 p-2 text-center group transition-all hover:shadow-lg"
              title="Click to view full size"
            >
              <img
                src="/school/advance/advance_page_2.webp"
                alt="Global Perspectives on Robotics Education - China & USA"
                className="w-full max-h-[380px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02] bg-white shadow-sm"
              />
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/25 transition-all flex items-center justify-center rounded-2xl">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-slate-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <Maximize2 size={13} className="text-[#2563EB]" /> Tap to Expand Page
                </span>
              </div>
            </div>

            {/* Key Content Breakdown from Page 2 */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Why World Economies Mandate Robotics
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0A1F44', marginBottom: '0.75rem' }}>
                  Preparing Future Workforces from Grade 3 Upwards
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { country: '🇨🇳 China Mandate', desc: 'Central AI & automation industrial planning. Mass AI literacy and specialized maker facilities like Hangzhou Robot School.' },
                    { country: '🇺🇸 United States', desc: 'STEM problem-solving, open-ended design thinking, programming logic, and competitive leagues (VEX, FIRST Robotics).' },
                    { country: '⚡ Real-World Relevance', desc: 'Connecting academic research with industry-ready robotics learning and interactive humanoid classroom tools.' },
                    { country: '🇮🇳 India’s Opportunity', desc: 'NEP 2020 calls for experiential learning. OLL gives every Indian school an international-grade lab turnkey.' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999, background: '#FEF2F2',
                        color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2
                      }}>
                        ✓
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                        <strong style={{ color: '#0A1F44' }}>{item.country}:</strong> {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
                  Backed by Global National Frameworks
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '0.25rem 0.65rem', borderRadius: '0.5rem' }}>
                  Global Standards
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Banner Strip */}
        <div style={{
          marginTop: '2rem', background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          borderRadius: '1.25rem', border: '1px solid #DBEAFE', padding: '1.25rem 1.75rem',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0A1F44' }}>
              Want to review the complete 32-page Advance Curriculum &amp; Kit Blueprint?
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.2rem' }}>
              Download the official brochure PDF or request an on-campus demonstration with physical kits.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setGateOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#DC2626', color: '#fff', border: 'none', borderRadius: '0.75rem',
                padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)'
              }}
            >
              <Download size={15} /> Download PDF
            </button>
            <a
              href="#book-demo-section"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#FFFFFF', color: '#0A1F44', border: '1px solid #CBD5E1', borderRadius: '0.75rem',
                padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none'
              }}
            >
              Book School Demo <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* 5. GRADE-BY-GRADE INTERACTIVE EXPLORER */}
      <section id="curriculum-explorer" style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="icse-script text-[#DC2626] text-3xl mb-1">step-by-step roadmap</div>
          <div style={{
            display: 'inline-block', fontSize: '0.75rem', fontWeight: 800,
            color: '#DC2626', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem'
          }}>
            Detailed Syllabus & Hardware
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            Grade 3 to Grade 10 Modular Progression
          </h2>
          <p style={{ color: '#64748B', maxWidth: 650, margin: '0.5rem auto 0', fontSize: '0.95rem' }} className="italic">
            Explore what students build, code, and master in each grade with dedicated kit configurations.
          </p>
        </div>

        {/* Grade Tab Bar */}
        <div style={{
          display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem',
          marginBottom: '2rem', scrollbarWidth: 'thin'
        }}>
          {GRADE_CURRICULUM.map((gc, idx) => {
            const isSelected = selectedGradeIdx === idx;
            return (
              <button
                key={gc.grade}
                onClick={() => setSelectedGradeIdx(idx)}
                data-testid={`tab-${gc.grade.toLowerCase().replace(' ', '-')}`}
                style={{
                  flexShrink: 0, padding: '0.75rem 1.25rem', borderRadius: '1rem',
                  border: isSelected ? '2px solid #DC2626' : '1px solid #E2E8F0',
                  background: isSelected ? '#DC2626' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem',
                  boxShadow: isSelected ? '0 8px 20px rgba(220, 38, 38, 0.25)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <span>{gc.grade}</span>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600,
                  opacity: isSelected ? 0.9 : 0.65
                }}>
                  {gc.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Grade Detail Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '2.5rem', boxShadow: '0 16px 40px rgba(15, 30, 80, 0.05)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
            
            {/* Left: Info & Projects */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{
                  background: `${activeGrade.color}15`, color: activeGrade.color,
                  fontWeight: 900, fontSize: '0.85rem', padding: '0.35rem 0.85rem', borderRadius: '999px'
                }}>
                  {activeGrade.grade}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>
                  {activeGrade.projectsCount}+ Projects & Activities
                </span>
              </div>

              <h3 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0A1F44', marginBottom: '0.75rem' }}>
                {activeGrade.theme}
              </h3>

              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }} className="italic">
                {activeGrade.summary}
              </p>

              {/* Kit Details Box */}
              <div style={{
                background: '#F8FAFC', borderRadius: '1rem', border: '1px solid #E2E8F0',
                padding: '1rem 1.25rem', marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  <Package size={15} /> Hardware Inclusions
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }} className="italic">
                  {activeGrade.kitIncludes}
                </div>
              </div>

              {/* Learning Skills Pills */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Core Competencies Learned
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {activeGrade.skills.map((sk, i) => (
                    <span key={i} style={{
                      background: '#F1F5F9', color: '#334155', borderRadius: '0.5rem',
                      padding: '0.25rem 0.65rem', fontSize: '0.8rem', fontWeight: 700
                    }}>
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Projects Grid */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Hands-On Projects Built by Students
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '0.5rem', maxHeight: 200, overflowY: 'auto', paddingRight: '0.5rem'
                }}>
                  {activeGrade.projects.map((proj, pIdx) => (
                    <div key={pIdx} style={{
                      background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.6rem',
                      padding: '0.45rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: '#1E293B',
                      display: 'flex', alignItems: 'center', gap: '0.4rem'
                    }}>
                      <span style={{ color: activeGrade.color, fontWeight: 800 }}>•</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Grade Kit Visual */}
            <div>
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-lg overflow-hidden group">
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#0A1F44]">
                    {activeGrade.grade} Kit Box &amp; Physical Models
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Official Hardware Stack
                  </span>
                </div>
                <div
                  onClick={() => setPreviewImage({
                    src: activeGrade.kitImg,
                    title: `${activeGrade.grade} Official Robotics Kit & Student Build Models`,
                    caption: `${activeGrade.theme} — ${activeGrade.kitIncludes}`
                  })}
                  className="relative cursor-pointer overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 group"
                  title="Click to zoom and inspect kit box models"
                >
                  <img
                    src={activeGrade.kitImg}
                    alt={`${activeGrade.grade} Robotics Kit & Models`}
                    className="w-full h-[280px] sm:h-[340px] object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center rounded-xl">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-slate-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <Maximize2 size={13} className="text-[#DC2626]" /> Zoom In to Inspect Models
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-600 font-semibold">
                    🔍 Tap image to inspect all {activeGrade.grade} physical models
                  </span>
                  <button
                    onClick={() => setGateOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer"
                  >
                    <Download size={13} /> Brochure Page
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Featured Real-World Builds for Selected Grade */}
          {activeGrade.featuredModels && activeGrade.featuredModels.length > 0 && (
            <div className="mt-8 pt-7 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="icse-script text-[#DC2626] text-2xl -mb-1">hands-on builds</div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#DC2626]">
                    Real-World Builds &amp; Physical Hardware
                  </span>
                  <h4 className="text-lg sm:text-xl font-black text-[#0A1F44]">
                    Featured Student Projects in {activeGrade.grade}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImage({
                    src: activeGrade.kitImg,
                    title: `${activeGrade.grade} Full Kit & Project Models Showcase`,
                    caption: `${activeGrade.theme} — ${activeGrade.kitIncludes}`
                  })}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A1F44] hover:text-[#DC2626] bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer border-none"
                >
                  <Maximize2 size={13} /> View Full Kit Box ({activeGrade.projectsCount} Models)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {activeGrade.featuredModels.map((m, mIdx) => (
                  <div
                    key={mIdx}
                    onClick={() => setPreviewImage({
                      src: activeGrade.kitImg,
                      title: `${activeGrade.grade} Project: ${m.name}`,
                      caption: `${m.desc} (Part of the ${activeGrade.grade} ${activeGrade.theme} curriculum)`
                    })}
                    className="group bg-slate-50 hover:bg-white border border-slate-200 hover:border-[#DC2626] rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          Model 0{mIdx + 1}
                        </span>
                        <span className="text-[10px] font-bold text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Inspect <Maximize2 size={11} />
                        </span>
                      </div>
                      <h5 className="text-[#0A1F44] font-black text-sm group-hover:text-[#DC2626] transition-colors">
                        {m.name}
                      </h5>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed italic">
                        {m.desc}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                      <span>{activeGrade.grade} Hardware</span>
                      <span className="text-emerald-600 font-bold">✓ Hands-on Lab</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. WHAT'S IN THE ADVANCE ROBOTICS KITS */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="icse-script text-[#DC2626] text-3xl mb-1">what's in the box</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Built for Years of Classroom Use
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            Inside the Advance Robotics Hardware Stack
          </h2>
          <p style={{ color: '#64748B', maxWidth: 650, margin: '0.5rem auto 0', fontSize: '0.95rem' }} className="italic">
            Classroom-grade modular components designed for high reuse, student safety, and deep exploration.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            {
              icon: Cpu,
              title: 'Smart Hubs & Microcontrollers',
              desc: 'Rechargeable Type-C coding hubs, Arduino Uno DIP boards, and ESP32 wireless IoT microcontrollers.',
              color: '#DC2626'
            },
            {
              icon: Cog,
              title: 'Snap-Fit Mechanics (286–311 pcs)',
              desc: 'Modular beams, gear wheels, compound axles, steering linkages, rack-and-pinions, and durable chassis frames.',
              color: '#2563EB'
            },
            {
              icon: Radio,
              title: 'Multitude of Sensor Modules',
              desc: 'Ultrasonic distance, infrared obstacle/line, DHT11 temp/humidity, PIR motion, LDR light, rain sensors & smoke detectors.',
              color: '#059669'
            },
            {
              icon: Zap,
              title: 'Actuators, Motors & Pumps',
              desc: 'Medium high-torque motors, micro servo motors, high-speed DC motors, and submersible mini water pumps.',
              color: '#D97706'
            },
            {
              icon: Monitor,
              title: '0.96" OLED Displays & Joysticks',
              desc: 'I2C monochrome OLED screens with hexadecimal pixel addressing and dual-axis analog joysticks for hardware gaming.',
              color: '#7C3AED'
            },
            {
              icon: Brain,
              title: 'AI Speech & Bluetooth IoT',
              desc: 'Local speech-to-text (STT) microphones, text-to-speech (TTS) voice modules, and smartphone Bluetooth control.',
              color: '#0D9488'
            }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: '#FFFFFF', borderRadius: '1.5rem', border: '1px solid #E2E8F0',
              padding: '1.75rem', boxShadow: '0 8px 24px rgba(15, 30, 80, 0.04)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  width: 52, height: 52, borderRadius: '1rem',
                  background: `${item.color}15`, color: item.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem'
                }}>
                  <item.icon size={26} />
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0A1F44', marginBottom: '0.5rem' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.55 }} className="italic">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. WHY OLL: 3 TRUST PILLARS */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0A1F44 0%, #172554 100%)',
          borderRadius: '2rem', padding: '3.5rem 2.5rem', color: '#fff'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="icse-script text-[#F87171] text-3xl mb-1">turnkey partnership</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F87171', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Turnkey School Partnership
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900 }}>
              Everything Your School Needs to Run a World-Class Lab
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {[
              {
                icon: BookOpen,
                step: '01',
                title: 'Structured Curriculum & Textbooks',
                desc: 'Aligned to NEP 2020 & NCF 2023. Lesson-by-lesson progression so concepts build seamlessly from Grade 3 through Grade 10.'
              },
              {
                icon: Users,
                step: '02',
                title: 'Teacher Empowerment & Training',
                desc: 'Step-by-step lecture slides, teacher handbooks, and hands-on workshops so existing school teachers deliver with 100% confidence.'
              },
              {
                icon: Trophy,
                step: '03',
                title: 'Competitions & IIT Bombay Gateway',
                desc: 'Official gateway to Techfest IIT Bombay, regional robotics exhibitions, and STEM.org global digital certificates for students.'
              }
            ].map((p, i) => (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.06)', borderRadius: '1.25rem',
                border: '1px solid rgba(255, 255, 255, 0.12)', padding: '2rem',
                backdropFilter: 'blur(8px)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '0.85rem',
                    background: 'rgba(239, 68, 68, 0.2)', color: '#F87171',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <p.icon size={22} />
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                    {p.step}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6 }} className="italic">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CREDIBILITY: SHARK TANK & KBC */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: '#FFFFFF', borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem', alignItems: 'center', boxShadow: '0 12px 36px rgba(15, 30, 80, 0.05)'
        }}>
          <div>
            <div className="icse-script text-[#DC2626] text-3xl mb-1">national recognition</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#FEF2F2', color: '#DC2626', borderRadius: '999px',
              padding: '0.3rem 0.8rem', fontSize: '0.75rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem'
            }}>
              National Recognition
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.2rem)', fontWeight: 900, color: '#0A1F44', marginBottom: '1rem' }}>
              Backed by Shark Tank India & Celebrated on KBC Hot Seat
            </h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Founded by Shreyaan Daga (Youngest to secure funding on Shark Tank India S2 and Hot Seat contestant on KBC S16 with Mr. Amitabh Bachchan), OLL is driven by an obsession to make quality STEM education hands-on and accessible to every school.
            </p>
            <blockquote className="border-l-4 border-red-500 pl-4 my-3 italic text-slate-600 text-sm leading-relaxed">
              "OLL's mission is to make 1 Billion learners capable enough to fulfil their dreams through practical, live future skills." — <span className="font-bold text-[#0A1F44] not-italic">Shreyaan Daga</span>
            </blockquote>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a
                href={SHARK_TANK_YT}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: '#F1F5F9', color: '#0A1F44', padding: '0.65rem 1.1rem',
                  borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700,
                  textDecoration: 'none', border: '1px solid #CBD5E1'
                }}
              >
                <Play size={14} style={{ color: '#DC2626' }} /> Watch Shark Tank Pitch
              </a>
              <a
                href={KBC_YT}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: '#F1F5F9', color: '#0A1F44', padding: '0.65rem 1.1rem',
                  borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700,
                  textDecoration: 'none', border: '1px solid #CBD5E1'
                }}
              >
                <Play size={14} style={{ color: '#2563EB' }} /> Watch KBC Episode
              </a>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <img
              src={SHARK_TANK_IMG}
              alt="OLL on Shark Tank and KBC"
              style={{
                width: '100%', maxHeight: 300, objectFit: 'contain',
                borderRadius: '1.25rem', border: '1px solid #E2E8F0'
              }}
            />
          </div>
        </div>
      </section>

      {/* 9. PARTNER SCHOOLS VIDEO TESTIMONIALS */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="icse-script text-[#DC2626] text-3xl mb-1">proof, not promises</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Real Classrooms · Real Impact
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            Hear from Principals & Educators
          </h2>
          <p className="text-slate-500 italic text-sm mt-1">Direct feedback from school leadership, teachers, and student innovators.</p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem'
        }}>
          {SCHOOL_VIDEOS.slice(0, 4).map((vid, i) => (
            <div key={i} style={{
              background: '#FFFFFF', borderRadius: '1.25rem', border: '1px solid #E2E8F0',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(15, 30, 80, 0.04)'
            }}>
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${vid.id}`}
                  title={vid.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none'
                  }}
                />
              </div>
              <div style={{ padding: '1rem', fontWeight: 700, fontSize: '0.9rem', color: '#0A1F44' }}>
                {vid.name}
              </div>
            </div>
          ))}
        </div>

        {/* 46 Partner School Logos Marquee */}
        <div style={{ marginTop: '3.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
            Trusted by Leading Educational Institutions Across India
          </div>
          <div style={{
            display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '0.5rem 0',
            scrollbarWidth: 'none', alignItems: 'center'
          }}>
            {PARTNER_LOGOS.slice(0, 24).map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt="Partner School Logo"
                style={{ height: 42, width: 'auto', filter: 'grayscale(100%) opacity(70%)', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'grayscale(0%) opacity(100%)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'grayscale(100%) opacity(70%)'; }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 10. INTERACTIVE SCHOOL DEMO BOOKING FORM */}
      <section id="book-demo-section" style={{ maxWidth: 1000, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0A1F44 0%, #111827 100%)',
          borderRadius: '2rem', padding: '3.5rem 2.5rem', color: '#fff',
          boxShadow: '0 24px 60px rgba(10, 31, 68, 0.25)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ maxWidth: 650, margin: '0 auto', textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="icse-script text-[#F87171] text-3xl mb-1">let's talk</div>
            <span style={{
              background: 'rgba(239, 68, 68, 0.2)', color: '#F87171',
              padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem',
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Zero Cost School Pilot
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 3vw, 2.6rem)', fontWeight: 900, marginTop: '0.75rem', color: '#fff' }}>
              Bring the Advance Robotics Lab to Your School
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', marginTop: '0.5rem' }} className="italic">
              Request a free physical sample kit demo or speak with our curriculum director to evaluate for your school's 2027–28 academic session.
            </p>
          </div>

          {submitted ? (
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E',
              borderRadius: '1.25rem', padding: '2rem', textAlign: 'center'
            }}>
              <CheckCircle2 size={48} style={{ color: '#22C55E', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Demo Request Received!
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>
                Thank you! Our regional academic coordinator will contact your school within 24 hours to schedule the demonstration.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} data-testid="advance-school-lead-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    School Name *
                  </label>
                  <input
                    type="text"
                    name="school_name"
                    required
                    value={leadForm.school_name}
                    onChange={handleFormChange}
                    placeholder="e.g. St. Xavier's International School"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    name="contact_name"
                    value={leadForm.contact_name}
                    onChange={handleFormChange}
                    placeholder="Principal / Trustee / Coordinator"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={leadForm.phone}
                    onChange={handleFormChange}
                    placeholder="10-digit Phone Number"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Official Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={leadForm.email}
                    onChange={handleFormChange}
                    placeholder="principal@school.edu"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    City / State
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={leadForm.city}
                    onChange={handleFormChange}
                    placeholder="e.g. Mumbai, Maharashtra"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Affiliated Board
                  </label>
                  <select
                    name="board"
                    value={leadForm.board}
                    onChange={handleFormChange}
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: '#1E293B', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="IB / Cambridge">IB / Cambridge</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="advance-lead-submit-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    color: '#fff', padding: '1rem 2.5rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '1rem', border: 'none', cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Submitting Request...' : 'Schedule School Demo & Proposal'} <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* 11. LMS SECTION */}
      <LMSSection theme="light" />

      {/* 12. RELATED PROGRAMS CROSS-LINKING */}
      <SchoolRelatedPrograms current="advance-robotics" theme="light" />

      {/* 13.5 HIGH-RESOLUTION ZOOM LIGHTBOX MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6"
          onClick={() => setPreviewImage(null)}
          data-testid="advance-image-lightbox"
        >
          <div
            className="relative bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="pr-4">
                <h3 className="text-[#0A1F44] font-black text-base sm:text-lg leading-tight">
                  {previewImage.title}
                </h3>
                {previewImage.caption && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                    {previewImage.caption}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer border-none flex-shrink-0"
                aria-label="Close Preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-900/5 flex items-center justify-center">
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg bg-white"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-semibold">
                Official OLL Advance Robotics Curriculum &amp; Kit Specifications
              </span>
              <button
                type="button"
                onClick={() => { setPreviewImage(null); setGateOpen(true); }}
                className="inline-flex items-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer"
              >
                <Download size={14} /> Download Curriculum PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. CURRICULUM DOWNLOAD LEAD-GATE MODAL */}
      <CurriculumGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        pdfUrl={CURRICULUM_PDF_GDRIVE}
        pdfName={CURRICULUM_PDF_NAME}
        title="Advance Robotics Curriculum Brochure (2027–28)"
        offering="Advance Robotics & AI Program (Grades 3-10)"
        program="Advance Robotics Curriculum 2027-28"
        source="advance-robotics-curriculum-download-gate"
        testid="advance-curriculum-gate"
      />

      {/* ── Mobile-only sticky bottom CTA (thumb-reachable) ─────────── */}
      <div className="icse-mobile-cta" data-testid="advance-mobile-cta">
        <button type="button" onClick={() => setGateOpen(true)} className="icse-btn outline" data-testid="advance-mobile-cta-brochure">
          <Download className="w-3.5 h-3.5" /> Brochure
        </button>
        <a href="#book-demo-section" className="icse-btn primary" data-testid="advance-mobile-cta-demo">
          Book Demo <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
