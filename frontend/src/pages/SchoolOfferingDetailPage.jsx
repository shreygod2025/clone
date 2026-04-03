import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, CheckCircle, Phone, Calendar, Users, Clock, 
  Award, Target, BookOpen, Play, Download, Menu, X,
  Cpu, Code, Brain, Lightbulb, TrendingUp, GraduationCap, School
} from 'lucide-react';
import { Button } from '../components/ui/button';
import Footer from '../components/Footer';

// All offerings data with rich SEO content
const ALL_OFFERINGS = {
  // Robotics
  'robotics-curriculum-kits': {
    category: 'robotics',
    title: 'Robotics Curriculum with Take-home Kits & Books',
    description: 'Complete robotics curriculum with kits that students can take home for practice. Our hands-on approach ensures students learn by doing, with age-appropriate kits designed for each grade level.',
    longDescription: `Transform your school's STEM education with OLL's comprehensive robotics curriculum. Each student receives their own take-home kit, enabling continued learning beyond the classroom. Our curriculum is aligned with NEP 2020 guidelines and covers fundamental concepts through advanced robotics applications.

Key Benefits:
• Students learn at their own pace with personal kits
• Parents can participate in their child's learning journey
• Reduces dependency on school lab availability
• Cost-effective solution for mass robotics education
• Regular assessments and progress tracking included`,
    features: ['Age-appropriate kits for each grade', 'Comprehensive workbooks with activities', 'Video tutorials and online resources', 'Parent involvement activities', 'Digital progress tracking dashboard', 'Quarterly assessments', 'Certificate of completion'],
    outcomes: ['Basic to advanced robotics concepts', 'Programming fundamentals', 'Problem-solving skills', 'Team collaboration', 'Scientific thinking'],
    ideal: 'Schools wanting hands-on learning without lab setup investment',
    grades: 'Classes 1-10',
    duration: '1 Academic Year',
    sessionsPerWeek: '1-2 sessions',
    batchSize: '25-30 students'
  },
  'robotics-lab-setup': {
    category: 'robotics',
    title: 'Robotics Curriculum with Lab Setup & Books',
    description: 'Full lab infrastructure setup with equipment, curriculum, and trained educators. Turn your school into a robotics excellence center with our end-to-end solution.',
    longDescription: `Establish a state-of-the-art robotics lab in your school with OLL's complete lab setup program. We handle everything from infrastructure design to educator training, ensuring your school becomes a center of excellence for robotics education.

What's Included:
• Complete lab design and equipment
• Multiple student workstations (10-20 based on space)
• Advanced robotics kits for competitive learning
• Trained educators deployed at your school
• Annual maintenance and upgrade support
• Competition preparation support`,
    features: ['Complete lab equipment and setup', 'Multiple student workstations', 'Advanced robotics kits (Arduino, Raspberry Pi)', 'Trained OLL educators', 'Annual maintenance support', 'Competition preparation', 'Industry-standard tools'],
    outcomes: ['Advanced robotics skills', 'Competition readiness', 'Innovation mindset', 'Technical expertise', 'Project management'],
    ideal: 'Schools ready to invest in long-term robotics infrastructure',
    grades: 'Classes 5-12',
    duration: '1 Academic Year (renewable)',
    sessionsPerWeek: '2-3 sessions',
    batchSize: '15-20 students per batch'
  },
  'robotics-exhibition-prep': {
    category: 'robotics',
    title: 'Robotics Exhibition Preparation',
    description: 'Intensive preparation program for robotics exhibitions and science fairs. Our expert mentors guide students from ideation to final presentation.',
    longDescription: `Give your students the competitive edge at science fairs and robotics exhibitions. Our specialized program covers everything from project ideation to presentation skills, ensuring students are fully prepared to showcase their innovations.

Program Highlights:
• Brainstorming sessions for innovative project ideas
• Technical building and programming workshops
• Presentation and communication training
• Mock judging sessions with feedback
• Documentation and report writing skills`,
    features: ['Project ideation workshops', 'Building & programming sessions', 'Presentation skills training', 'Judging criteria preparation', 'Mock exhibitions', 'Documentation guidance', 'Mentor support until event'],
    outcomes: ['Exhibition-ready projects', 'Public speaking confidence', 'Technical documentation skills', 'Problem-solving under pressure', 'Award-winning presentations'],
    ideal: 'Schools participating in science fairs and exhibitions',
    grades: 'Classes 5-12',
    duration: '2-3 Months',
    sessionsPerWeek: '2-3 intensive sessions',
    batchSize: '10-15 students'
  },
  'host-robotics-exhibition': {
    category: 'robotics',
    title: 'Host a Robotics Exhibition in Your School',
    description: 'Transform your school into a robotics showcase venue. We handle complete event management including equipment, judging, and media coverage.',
    longDescription: `Put your school on the map by hosting a prestigious robotics exhibition. OLL provides end-to-end event management, bringing together students from multiple schools for a day of innovation and competition.

Event Package Includes:
• Complete event planning and coordination
• All necessary equipment and display materials
• Expert judging panel from industry
• Certificates, trophies, and prizes
• Photography and video coverage
• Press release and media coordination
• Post-event report and highlights`,
    features: ['Complete event planning', 'Equipment & display setup', 'Expert judging panel', 'Certificates & prizes', 'Media coverage support', 'Multi-school participation coordination', 'Safety and logistics management'],
    outcomes: ['School branding enhancement', 'Student motivation', 'Community engagement', 'Media visibility', 'Inter-school networking'],
    ideal: 'Schools wanting to establish thought leadership in STEM',
    grades: 'All classes can participate',
    duration: '1-2 Days Event',
    sessionsPerWeek: 'N/A',
    batchSize: '100-500 participants'
  },
  'iit-bombay-competitions': {
    category: 'robotics',
    title: 'Participate in Robotics Competitions at IIT Bombay',
    description: 'Elite training program for national-level robotics competitions at IIT Bombay Techfest - Asia\'s largest science and technology festival.',
    longDescription: `Prepare your students for the ultimate robotics challenge at IIT Bombay Techfest. Our specialized program has helped hundreds of students win at national-level competitions, with dedicated mentorship from competition veterans.

Program Features:
• Competition-specific rule training
• Advanced building techniques
• Strategy development sessions
• Mock competitions with scoring
• Travel and accommodation coordination
• On-site support during event
• Post-competition career guidance`,
    features: ['Competition-specific training', 'Advanced robotics techniques', 'Strategy and planning sessions', 'Travel coordination', 'Team mentorship', 'On-site support', 'Post-competition analysis'],
    outcomes: ['National-level competition experience', 'IIT campus exposure', 'Advanced technical skills', 'Teamwork under pressure', 'Resume enhancement'],
    ideal: 'Advanced students ready for national competitions',
    grades: 'Classes 8-12',
    duration: '3-4 Months intensive',
    sessionsPerWeek: '3-4 sessions',
    batchSize: '5-10 students per team'
  },
  'robotics-competition-prep': {
    category: 'robotics',
    title: 'Preparation for Robotics Competitions',
    description: 'General preparation program for various national and international robotics competitions. Build skills and confidence for any competition format.',
    longDescription: `Not sure which competition to target? Our general competition preparation program builds versatile skills applicable to any robotics contest. Students learn different competition formats, rules, and winning strategies.

Coverage Includes:
• Overview of major robotics competitions in India
• Common competition formats and rules
• Universal skill building (building, coding, strategy)
• Team formation and role assignment
• Time management during competitions
• Handling pressure situations`,
    features: ['Competition landscape overview', 'Multi-format skill building', 'Mock competitions', 'Team formation guidance', 'Strategy sessions', 'Stress management', 'Competition selection advice'],
    outcomes: ['Competition readiness', 'Versatile skills', 'Team dynamics understanding', 'Strategic thinking', 'Confidence boost'],
    ideal: 'Schools wanting general competition exposure',
    grades: 'Classes 6-12',
    duration: '2-3 Months',
    sessionsPerWeek: '2 sessions',
    batchSize: '15-20 students'
  },
  'icse-group3-kits': {
    category: 'robotics',
    title: 'Grade 9 & 10 ICSE Group 3 Subject Kits',
    description: 'Specialized robotics kits aligned with ICSE curriculum for Group 3 elective subjects. Board-approved materials with exam-focused content.',
    longDescription: `Specifically designed for ICSE schools offering robotics as a Group 3 subject. Our kits and curriculum are aligned with the latest ICSE syllabus, ensuring students excel in both practicals and theory.

Curriculum Alignment:
• 100% ICSE syllabus coverage
• Practical experiments as per board requirements
• Theory notes and question banks
• Previous years' paper solutions
• Regular board-pattern assessments
• Pre-board preparation support`,
    features: ['ICSE curriculum-aligned content', 'Board-approved practical experiments', 'Comprehensive theory materials', 'Previous years\' question papers', 'Regular mock tests', 'Pre-board intensive sessions', 'Doubt clearing sessions'],
    outcomes: ['Board exam excellence', 'Practical skills certification', 'Strong conceptual foundation', 'Exam confidence', 'College readiness'],
    ideal: 'ICSE schools with Group 3 robotics',
    grades: 'Classes 9-10',
    duration: '2 Academic Years',
    sessionsPerWeek: '2-3 sessions',
    batchSize: '20-25 students'
  },
  'afterschool-robotics': {
    category: 'robotics',
    title: 'Afterschool Robotics Classes',
    description: 'Engaging afterschool robotics program with flexible timings. Perfect for schools wanting to offer robotics as an extra-curricular activity.',
    longDescription: `Add value to your school's extra-curricular offerings with OLL's afterschool robotics program. Flexible timings ensure students can participate without affecting regular academics.

Program Benefits:
• Flexible timing (post school hours)
• Small batch sizes for personalized attention
• Progressive curriculum from basics to advanced
• Monthly progress reports to parents
• Showcase events every quarter
• Certificate program with levels`,
    features: ['Flexible timing options', 'Small batch sizes (8-12)', 'Progressive curriculum', 'Monthly progress reports', 'Parent communication portal', 'Quarterly showcase events', 'Level-based certification'],
    outcomes: ['Hobby development', 'Stress-free learning', 'Peer interaction', 'Skill progression', 'Portfolio building'],
    ideal: 'Schools wanting extra-curricular robotics program',
    grades: 'Classes 1-10',
    duration: 'Ongoing (semester-based)',
    sessionsPerWeek: '1-2 sessions',
    batchSize: '8-12 students'
  },
  'robotics-summer-camp': {
    category: 'robotics',
    title: 'Robotics Summer Camp',
    description: 'Fun-filled summer robotics camp combining learning with entertainment. Students build exciting projects while making lasting memories.',
    longDescription: `Make summer vacations productive and fun with OLL's robotics summer camp. Our carefully designed program balances technical learning with engaging activities, ensuring students return with new skills and great memories.

Camp Highlights:
• Daily hands-on building sessions
• Fun robotics challenges and games
• Field trips to tech companies (where possible)
• Guest sessions with robotics professionals
• Final project showcase with parents
• Certificates and prizes for all`,
    features: ['Daily interactive sessions', 'Project-based learning', 'Fun challenges and competitions', 'Final showcase event', 'Certificate of completion', 'Take-home mini project', 'Snacks and refreshments included'],
    outcomes: ['Productive vacation', 'New friendships', 'Hands-on experience', 'Creativity boost', 'Foundation for future learning'],
    ideal: 'Summer vacation engagement for students',
    grades: 'Classes 1-8',
    duration: '2-4 Weeks',
    sessionsPerWeek: '5-6 days per week',
    batchSize: '20-25 students'
  },
  'robotics-ai-seminar': {
    category: 'robotics',
    title: 'Robotics & AI Seminar for Students',
    description: 'Eye-opening one-day seminar introducing students to the world of robotics and AI. Perfect for creating awareness and sparking interest.',
    longDescription: `Spark curiosity about robotics and AI with our engaging one-day seminar. Designed to inspire and inform, this session gives students a glimpse into the exciting world of intelligent machines.

Seminar Agenda:
• What is robotics? Live demonstrations
• Introduction to AI and machine learning
• Career opportunities in tech
• Interactive Q&A session
• Hands-on mini activity
• Take-home resources and next steps`,
    features: ['Live robot demonstrations', 'Interactive AI demos', 'Career guidance session', 'Hands-on mini activity', 'Q&A with experts', 'Resource kit for each student', 'Parent session (optional)'],
    outcomes: ['Technology awareness', 'Career clarity', 'Interest development', 'Informed decision making', 'Inspiration to learn more'],
    ideal: 'Schools wanting introductory exposure to robotics',
    grades: 'Classes 5-12',
    duration: '1 Day (4-6 hours)',
    sessionsPerWeek: 'N/A',
    batchSize: '50-200 students'
  },
  'robotics-books': {
    category: 'robotics',
    title: 'Robotics Books',
    description: 'Comprehensive robotics textbooks and workbooks for schools. Grade-wise content with activities, experiments, and assessments.',
    longDescription: `Enhance your robotics curriculum with OLL's professionally designed textbooks and workbooks. Each book is carefully crafted for the Indian education context with age-appropriate content.

Book Features:
• Colorful, engaging illustrations
• Step-by-step activity guides
• Theory explanations in simple language
• Practice questions and assessments
• QR codes linking to video tutorials
• Answer keys for teachers`,
    features: ['Grade-wise content (1-10)', 'Full-color illustrated guides', 'Activity sheets and experiments', 'Assessment tools', 'Digital resources via QR', 'Teacher editions available', 'Bulk pricing for schools'],
    outcomes: ['Structured learning', 'Self-paced study', 'Reference material', 'Assessment ready', 'Curriculum support'],
    ideal: 'Schools needing curriculum support materials',
    grades: 'Classes 1-10',
    duration: 'N/A (one-time purchase)',
    sessionsPerWeek: 'N/A',
    batchSize: 'Any quantity'
  },
  'robotics-kits': {
    category: 'robotics',
    title: 'Robotics Kits',
    description: 'Quality robotics kits for hands-on learning. Available in multiple skill levels from beginner to advanced.',
    longDescription: `Get the best robotics kits for your school from OLL. Our kits are designed for durability, reusability, and maximum learning impact. Choose from multiple levels based on your students' experience.

Kit Categories:
• Beginner Kits (Classes 1-4): Simple mechanisms, basic circuits
• Intermediate Kits (Classes 5-7): Motors, sensors, simple programming
• Advanced Kits (Classes 8-10): Arduino, advanced sensors, complex projects
• Competition Kits: Professional-grade components

All kits include:
• Detailed instruction manuals
• Online video support
• Replacement parts availability
• 1-year warranty`,
    features: ['Multiple skill levels', 'Durable, reusable components', 'Detailed manuals', 'Video tutorials', 'Replacement parts available', '1-year warranty', 'Bulk discounts'],
    outcomes: ['Hands-on experience', 'Technical skills', 'Component understanding', 'Project building capability', 'Foundation for advanced learning'],
    ideal: 'Schools needing quality robotics equipment',
    grades: 'Classes 1-12',
    duration: 'N/A (one-time purchase)',
    sessionsPerWeek: 'N/A',
    batchSize: 'Any quantity'
  },

  // Financial Literacy & Entrepreneurship
  'entrepreneurship-workshop': {
    category: 'financial-literacy',
    title: 'Entrepreneurship 3 Day Workshop',
    description: 'Intensive 3-day workshop to ignite entrepreneurial thinking in students. From idea generation to pitch presentation.',
    longDescription: `Transform students into young entrepreneurs with our action-packed 3-day workshop. This immersive experience takes students through the complete entrepreneurial journey, from identifying problems to pitching solutions.

Day 1: Ideation & Problem Solving
• Design thinking introduction
• Problem identification exercises
• Brainstorming techniques
• Idea validation methods

Day 2: Business Model Development
• Understanding customers
• Value proposition design
• Revenue model basics
• Competitive analysis

Day 3: Pitch & Presentation
• Pitch deck creation
• Public speaking training
• Mock pitches with feedback
• Final competition`,
    features: ['Interactive workshops', 'Design thinking methodology', 'Business model canvas', 'Pitch training', 'Mini competition', 'Mentor feedback', 'Certificate and prizes'],
    outcomes: ['Entrepreneurial mindset', 'Problem-solving skills', 'Business basics understanding', 'Presentation confidence', 'Teamwork experience'],
    ideal: 'Schools wanting quick entrepreneurship exposure',
    grades: 'Classes 8-12',
    duration: '3 Days',
    sessionsPerWeek: 'Intensive (6-8 hours/day)',
    batchSize: '30-50 students'
  },
  'skill-titans-olympiad': {
    category: 'financial-literacy',
    title: 'Skill Titans TV Show & Entrepreneurship Olympiad',
    description: 'Participate in India\'s first student entrepreneur TV show on CNBC TV18. Real funding opportunities for student ventures.',
    longDescription: `Give your students a once-in-a-lifetime opportunity to pitch on national television. Skill Titans, aired on CNBC TV18, is India's first show where school students pitch to real investors for real funding.

Journey Overview:
1. School-level entrepreneurship training
2. Intra-school idea competition
3. Regional selection rounds
4. National finals with TV recording
5. Potential funding for winning ideas

Past Winners Have:
• Received funding up to ₹25 lakhs
• Started actual businesses
• Gained national recognition
• Featured in major media outlets`,
    features: ['School-level training', 'Multi-round selection', 'TV appearance opportunity', 'Real investor pitching', 'Funding possibilities', 'National recognition', 'Media coverage'],
    outcomes: ['TV exposure', 'Real business experience', 'Investor interaction', 'National recognition', 'Potential funding'],
    ideal: 'Schools with aspiring young entrepreneurs',
    grades: 'Classes 8-12',
    duration: '3-4 Months',
    sessionsPerWeek: '2 sessions + weekend workshops',
    batchSize: '20-30 selected students'
  },
  'fl-curriculum': {
    category: 'financial-literacy',
    title: 'Financial Literacy & Entrepreneurship Program',
    description: 'Year-long comprehensive program integrating financial literacy and entrepreneurship into school curriculum. Build money-smart, business-ready students.',
    longDescription: `Prepare students for real-world financial decisions with our comprehensive year-long program. Covering everything from basic money management to business planning, this curriculum creates financially literate and entrepreneurial young minds.

Curriculum Modules:
• Money Basics: Saving, spending, budgeting
• Banking & Investments: How banks work, types of investments
• Taxes & Government: Understanding the economy
• Business Fundamentals: Starting and running a business
• Digital Finance: UPI, digital payments, online safety
• Stock Market: Basics of investing (simulation included)`,
    features: ['Weekly integrated classes', 'Stock market simulation', 'Business plan projects', 'Financial games and activities', 'Real-world case studies', 'Parent workshops', 'Certification'],
    outcomes: ['Financial literacy', 'Money management skills', 'Investment awareness', 'Business acumen', 'Economic understanding'],
    ideal: 'Schools wanting long-term financial education',
    grades: 'Classes 6-12',
    duration: '1 Academic Year',
    sessionsPerWeek: '1-2 sessions',
    batchSize: '30-40 students'
  },
  'ecell-opening': {
    category: 'financial-literacy',
    title: 'E-Cell Opening in School',
    description: 'Establish an Entrepreneurship Cell in your school. Create a culture of innovation with student-led initiatives and ongoing support.',
    longDescription: `Transform your school into a hub of innovation by establishing an Entrepreneurship Cell (E-Cell). This student-led initiative, supported by OLL, creates a sustainable culture of entrepreneurship.

E-Cell Setup Includes:
• E-Cell structure and governance design
• Student council formation and training
• Annual event calendar planning
• Mentor network access
• Inter-school E-Cell connections
• Ongoing guidance and support

E-Cell Activities:
• Monthly ideation sessions
• Guest speaker series
• Business plan competitions
• Startup visits
• Networking events`,
    features: ['Complete setup support', 'Student council training', 'Event calendar design', 'Mentor network access', 'Inter-school connections', 'Ongoing guidance', 'Annual recognition program'],
    outcomes: ['Entrepreneurship culture', 'Student leadership', 'Innovation mindset', 'Network building', 'Sustainable initiative'],
    ideal: 'Schools wanting to build entrepreneurship culture',
    grades: 'Classes 8-12 (student-led)',
    duration: 'Ongoing (setup + support)',
    sessionsPerWeek: 'As per E-Cell calendar',
    batchSize: '10-15 core team + all interested'
  },
  'fl-summer-camp': {
    category: 'financial-literacy',
    title: 'Financial Literacy & Entrepreneurship Summer Camp',
    description: 'Fun summer program combining money skills with business thinking. Students learn through games, simulations, and real-world projects.',
    longDescription: `Make summer vacations financially productive with our engaging camp. Through games, simulations, and hands-on activities, students learn essential money skills while having fun.

Camp Highlights:
• Stock market simulation game
• Business plan competition
• Market day: Students sell real products
• Guest sessions with entrepreneurs
• Financial planning exercises
• Team challenges and prizes`,
    features: ['Interactive financial games', 'Stock market simulation', 'Business plan creation', 'Market day event', 'Guest entrepreneur sessions', 'Team competitions', 'Certificate and prizes'],
    outcomes: ['Money management basics', 'Investment awareness', 'Business thinking', 'Team collaboration', 'Fun learning experience'],
    ideal: 'Summer vacation financial education',
    grades: 'Classes 5-10',
    duration: '2-3 Weeks',
    sessionsPerWeek: '5 days per week',
    batchSize: '25-30 students'
  },

  // AI
  'ai-center-excellence': {
    category: 'ai',
    title: 'Launch an AI Center for Excellence',
    description: 'Establish a dedicated AI learning hub in your school with infrastructure, curriculum, and expert educators. Future-proof your school.',
    longDescription: `Position your school at the forefront of technology education by establishing an AI Center for Excellence. This comprehensive solution includes everything needed to deliver world-class AI education.

Center Setup Includes:
• Computer lab with AI-capable machines
• Cloud computing access for AI projects
• Industry-standard AI tools and platforms
• Comprehensive AI curriculum (basics to advanced)
• Trained AI educators
• Industry partnership opportunities

Students Will Learn:
• AI fundamentals and history
• Machine learning basics
• Natural language processing
• Computer vision introduction
• AI ethics and responsible AI
• Building AI applications`,
    features: ['Complete infrastructure setup', 'High-performance computing', 'AI/ML software licenses', 'Expert educator deployment', 'Industry partnerships', 'Research project support', 'Annual upgrades'],
    outcomes: ['AI literacy', 'Future-ready skills', 'Innovation capability', 'Industry exposure', 'Research mindset'],
    ideal: 'Schools investing in cutting-edge technology education',
    grades: 'Classes 8-12',
    duration: '1 Academic Year (renewable)',
    sessionsPerWeek: '3-4 sessions',
    batchSize: '20-25 students per batch'
  },
  'agentic-ai-workshop': {
    category: 'ai',
    title: 'Agentic AI Workshop for Students',
    description: 'Hands-on workshop on building AI agents - the hottest trend in AI. Students learn to create intelligent assistants and automation tools.',
    longDescription: `Introduce students to the cutting-edge world of AI agents - autonomous systems that can perform tasks, make decisions, and interact intelligently. This practical workshop demystifies AI through hands-on projects.

Workshop Modules:
• What are AI agents?
• Understanding LLMs (Large Language Models)
• Building simple chatbots
• Creating automation workflows
• Ethical considerations
• Real-world applications`,
    features: ['Latest AI concepts', 'Hands-on agent building', 'No-code AI tools', 'Real project creation', 'Take-home resources', 'Expert instruction', 'Q&A sessions'],
    outcomes: ['AI agent understanding', 'Practical AI skills', 'Prompt engineering basics', 'Automation thinking', 'Future tech awareness'],
    ideal: 'Tech-enthusiast students wanting cutting-edge skills',
    grades: 'Classes 9-12',
    duration: '2-3 Days',
    sessionsPerWeek: 'Intensive workshop',
    batchSize: '20-30 students'
  },
  'ai-seminar': {
    category: 'ai',
    title: 'AI Seminar',
    description: 'Comprehensive one-day AI awareness seminar covering basics, applications, careers, and hands-on demos. Perfect for creating AI awareness.',
    longDescription: `Demystify Artificial Intelligence for your students with our engaging seminar. From understanding what AI really is to exploring career opportunities, this session covers everything students need to know about the AI revolution.

Seminar Agenda:
• What is AI? (not what movies show!)
• AI in everyday life (demos)
• Machine learning explained simply
• AI career paths and opportunities
• Hands-on: Talk to an AI
• Q&A with AI professionals`,
    features: ['AI fundamentals explained simply', 'Live AI demonstrations', 'Career guidance', 'Interactive activities', 'Expert speakers', 'Resource materials', 'Parent session option'],
    outcomes: ['AI awareness', 'Career clarity', 'Technology appreciation', 'Informed decisions', 'Interest development'],
    ideal: 'Schools wanting AI awareness for students',
    grades: 'Classes 6-12',
    duration: '1 Day (4-6 hours)',
    sessionsPerWeek: 'N/A',
    batchSize: '50-200 students'
  },
  'agentic-ai-summer-camp': {
    category: 'ai',
    title: 'Agentic AI Summer Camp',
    description: 'Intensive summer program on AI and automation. Students build real AI projects while having fun during vacation.',
    longDescription: `Transform summer vacation into an AI adventure. Our intensive camp takes students from AI basics to building their own intelligent applications, with plenty of fun activities along the way.

Camp Structure:
Week 1: AI Fundamentals
• Understanding AI and ML
• Exploring AI tools
• Simple projects

Week 2: Building AI Applications
• Chatbot creation
• Image recognition projects
• Voice assistants

Week 3-4: Advanced Projects
• Custom AI agent building
• Team projects
• Final showcase`,
    features: ['Progressive AI curriculum', 'Hands-on daily projects', 'Fun AI challenges', 'Team competitions', 'Final showcase event', 'Certificate and prizes', 'Take-home projects'],
    outcomes: ['AI practical skills', 'Project portfolio', 'Future tech readiness', 'Creative problem solving', 'Collaboration experience'],
    ideal: 'Summer vacation AI learning',
    grades: 'Classes 8-12',
    duration: '2-4 Weeks',
    sessionsPerWeek: '5-6 days',
    batchSize: '20-25 students'
  },
  'ai-services-agency-course': {
    category: 'ai',
    title: 'Start AI Services Agency Course',
    description: 'Entrepreneurship meets AI - learn to build and run an AI services business. Ideal for college students and senior school students.',
    longDescription: `Turn AI skills into a business opportunity. This unique course teaches students how to start and run an AI services agency, combining technical skills with business acumen.

Course Modules:
• AI tools mastery (ChatGPT, Claude, Midjourney, etc.)
• Service offering design
• Client acquisition strategies
• Project management
• Pricing and proposals
• Building a portfolio
• Scaling the business`,
    features: ['AI tools training', 'Business model design', 'Client acquisition strategies', 'Portfolio building', 'Mentorship from agency owners', 'Internship opportunities', 'Job placement support'],
    outcomes: ['Freelancing capability', 'Business skills', 'AI expertise', 'Client management', 'Income generation'],
    ideal: 'College students and senior school students',
    grades: 'Classes 11-12 and College',
    duration: '2-3 Months',
    sessionsPerWeek: '3 sessions',
    batchSize: '15-20 students'
  },

  // Coding
  'vibe-coding-seminar': {
    category: 'coding',
    title: 'Vibe Coding Seminar',
    description: 'Fun and engaging coding awareness session that makes programming approachable and exciting. Perfect for sparking interest in coding.',
    longDescription: `Make coding feel fun and accessible with our Vibe Coding seminar. We break down the intimidating image of programming and show students that anyone can code.

Seminar Highlights:
• "Anyone can code" mindset building
• Live coding demonstrations
• Simple interactive coding activities
• Career paths in programming
• Resources for self-learning
• Q&A session`,
    features: ['Engaging presentation style', 'Live coding demos', 'Interactive mini-activities', 'Career insights', 'Self-learning resources', 'Follow-up support', 'Parent session option'],
    outcomes: ['Coding demystified', 'Interest sparked', 'Career awareness', 'Learning resources', 'Motivation to start'],
    ideal: 'Schools wanting introductory coding exposure',
    grades: 'Classes 5-10',
    duration: '1 Day (3-4 hours)',
    sessionsPerWeek: 'N/A',
    batchSize: '50-150 students'
  },
  'coding-afterschool': {
    category: 'coding',
    title: 'Coding & Logic Building After School Classes',
    description: 'Regular afterschool coding classes developing programming skills and logical thinking. From Scratch to Python and beyond.',
    longDescription: `Build strong coding foundations with our structured afterschool program. We focus not just on syntax but on developing logical thinking and problem-solving abilities that transfer to all areas of life.

Curriculum Path:
Beginner (Classes 3-5): Scratch, Code.org, Basic logic
Intermediate (Classes 6-8): Python basics, Web HTML/CSS
Advanced (Classes 9-10): Python projects, JavaScript, App development

Each level includes:
• Concept introduction
• Guided practice
• Independent projects
• Code reviews
• Assessments`,
    features: ['Age-appropriate curriculum', 'Small batch sizes', 'Project-based learning', 'Regular assessments', 'Code review sessions', 'Parent progress updates', 'Certificate program'],
    outcomes: ['Programming skills', 'Logical thinking', 'Problem-solving ability', 'Digital creation skills', 'Future career foundation'],
    ideal: 'Schools offering coding as extra-curricular',
    grades: 'Classes 3-10',
    duration: 'Ongoing (semester-based)',
    sessionsPerWeek: '2 sessions',
    batchSize: '12-15 students'
  },
  'coding-summer-camp': {
    category: 'coding',
    title: 'Coding Summer Camp',
    description: 'Intensive summer coding program taking students from basics to building their own projects. Game development, websites, and more.',
    longDescription: `Transform summer vacation into a coding adventure. Our intensive camp takes students through an exciting journey of creating games, websites, and applications.

Camp Tracks (students choose one):
Track 1: Game Development
• Scratch game creation
• Python game basics
• Final game project

Track 2: Web Development
• HTML/CSS basics
• Building personal websites
• Interactive web projects

Track 3: App Development (advanced)
• App design principles
• Building with AppInventor
• Final app project`,
    features: ['Multiple learning tracks', 'Project-based curriculum', 'Game/web/app development', 'Final project showcase', 'Certificate of completion', 'Portfolio building', 'Fun coding challenges'],
    outcomes: ['Coding skills', 'Project portfolio', 'Creative expression', 'Technical confidence', 'Showcase-worthy projects'],
    ideal: 'Summer vacation coding learning',
    grades: 'Classes 4-10',
    duration: '2-4 Weeks',
    sessionsPerWeek: '5 days per week',
    batchSize: '15-20 students'
  },
};

const CATEGORY_INFO = {
  'robotics': { icon: Cpu, color: '#D63031', gradient: 'from-[#D63031] to-[#e84142]', title: 'Robotics' },
  'financial-literacy': { icon: TrendingUp, color: '#1E3A5F', gradient: 'from-[#1E3A5F] to-[#2C5282]', title: 'Financial Literacy & Entrepreneurship' },
  'ai': { icon: Brain, color: '#D63031', gradient: 'from-[#D63031] to-[#1E3A5F]', title: 'AI & Machine Learning' },
  'coding': { icon: Code, color: '#1E3A5F', gradient: 'from-[#1E3A5F] to-[#2C5282]', title: 'Coding & Programming' },
};

const SchoolOfferingDetailPage = () => {
  const navigate = useNavigate();
  const { categoryId, offeringId } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const offering = ALL_OFFERINGS[offeringId];
  const category = CATEGORY_INFO[categoryId];
  
  if (!offering || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Program not found</h1>
          <Button onClick={() => navigate('/school-offerings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = category.icon;

  // Generate rich SEO keywords based on category and offering
  const seoKeywords = `${offering.title}, ${category.title} for schools, school ${category.title.toLowerCase()} program, ${category.title.toLowerCase()} curriculum India, OLL ${category.title.toLowerCase()}, school skill education, robotics lab setup for schools, STEM program India`;

  // Concise SEO description under 155 chars
  const seoDesc = offering.description.length > 120
    ? `${offering.description.substring(0, 117)}... OLL's ${category.title} program for schools India. Free demo!`
    : `${offering.description} OLL school program. Book a free demo today!`;

  return (
    <>
      <Helmet>
        <title>{offering.title} for Schools | OLL - India's Skill Education Partner</title>
        <meta name="description" content={seoDesc.substring(0, 155)} />
        <meta name="keywords" content={seoKeywords} />
        <link rel="canonical" href={`https://oll.co/school-offerings/${categoryId}/${offeringId}`} />

        {/* Open Graph */}
        <meta property="og:title" content={`${offering.title} | OLL School Programs`} />
        <meta property="og:description" content={offering.description.substring(0, 120)} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`https://oll.co/school-offerings/${categoryId}/${offeringId}`} />
        <meta property="og:image" content="https://oll.co/og-image.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${offering.title} | OLL`} />
        <meta name="twitter:description" content={offering.description.substring(0, 120)} />
        <meta name="twitter:image" content="https://oll.co/og-image.png" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            "name": offering.title,
            "description": offering.description,
            "provider": {
              "@type": "Organization",
              "name": "OLL",
              "sameAs": "https://oll.co",
              "url": "https://oll.co"
            },
            "educationalLevel": "K-12",
            "teaches": offering.outcomes,
            "timeRequired": offering.duration,
            "url": `https://oll.co/school-offerings/${categoryId}/${offeringId}`,
            "isAccessibleForFree": false,
            "offers": {
              "@type": "Offer",
              "category": "Educational Program",
              "availability": "https://schema.org/InStock",
              "areaServed": "IN"
            },
            "hasCourseInstance": {
              "@type": "CourseInstance",
              "courseMode": "Onsite",
              "courseWorkload": offering.sessionsPerWeek,
              "instructor": {
                "@type": "Organization",
                "name": "OLL Educators"
              }
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://oll.co/"},
              {"@type": "ListItem", "position": 2, "name": "School Programs", "item": "https://oll.co/school-offerings"},
              {"@type": "ListItem", "position": 3, "name": category.title, "item": `https://oll.co/school-offerings/${categoryId}/${offeringId}`},
              {"@type": "ListItem", "position": 4, "name": offering.title, "item": `https://oll.co/school-offerings/${categoryId}/${offeringId}`}
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                  alt="OLL Logo - Skill Education Platform"
                  title="OLL - School Programs"
                  loading="eager"
                  width="120"
                  height="40"
                  className="h-10 w-auto"
                />
              </Link>
              
              <div className="hidden md:flex items-center gap-8">
                <Link to="/school-offerings" className="text-slate-600 hover:text-[#1E3A5F] font-medium">All Programs</Link>
                <Button 
                  onClick={() => navigate('/school')}
                  className="bg-[#D63031] hover:bg-[#b52828] text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Book a Meeting
                </Button>
              </div>

              <button 
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden bg-white border-t border-slate-100 py-4 px-4 space-y-3">
                <Link 
                  to="/school-offerings" 
                  className="block py-2 text-slate-600 hover:text-[#1E3A5F] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  All Programs
                </Link>
                <Button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/school');
                  }}
                  className="w-full bg-[#D63031] hover:bg-[#b52828] text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Book a Meeting
                </Button>
              </div>
            )}
          </div>
        </nav>

        {/* Hero */}
        <section className={`bg-gradient-to-br ${category.gradient} py-16`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/school-offerings')}
              className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Programs
            </Button>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm mb-4">
                  <IconComponent className="w-4 h-4" />
                  {category.title}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {offering.title}
                </h1>
                <p className="text-white/80 text-lg mb-6">
                  {offering.description}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    size="lg"
                    onClick={() => navigate('/school')}
                    className="bg-white text-slate-900 hover:bg-slate-100"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Get Started
                  </Button>
                </div>
              </div>
              
              <div className="hidden md:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-white" />
                    <div>
                      <div className="text-white/60 text-sm">Duration</div>
                      <div className="text-white font-medium">{offering.duration}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-white" />
                    <div>
                      <div className="text-white/60 text-sm">Ideal For</div>
                      <div className="text-white font-medium">{offering.ideal}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Program Details Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <Clock className="w-8 h-8 text-[#D63031] mb-3" />
                <h3 className="font-semibold text-[#1E3A5F] mb-1">Duration</h3>
                <p className="text-slate-600">{offering.duration}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <GraduationCap className="w-8 h-8 text-[#D63031] mb-3" />
                <h3 className="font-semibold text-[#1E3A5F] mb-1">Grade Level</h3>
                <p className="text-slate-600">{offering.grades || 'All grades'}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <Users className="w-8 h-8 text-[#D63031] mb-3" />
                <h3 className="font-semibold text-[#1E3A5F] mb-1">Batch Size</h3>
                <p className="text-slate-600">{offering.batchSize || 'Flexible'}</p>
              </div>
            </div>

            {/* Long Description */}
            {offering.longDescription && (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm mb-8">
                <h2 className="text-2xl font-bold text-[#1E3A5F] mb-6">Program Overview</h2>
                <div className="prose prose-slate max-w-none">
                  {offering.longDescription.split('\n\n').map((para, idx) => (
                    <p key={idx} className="text-slate-600 mb-4 whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm mb-8">
              <h2 className="text-2xl font-bold text-[#1E3A5F] mb-6">What's Included</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {offering.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Outcomes */}
            {offering.outcomes && (
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 mb-8">
                <h2 className="text-2xl font-bold text-[#1E3A5F] mb-6">Learning Outcomes</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offering.outcomes.map((outcome, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm">
                      <Award className="w-5 h-5 text-[#D63031] shrink-0" />
                      <span className="text-slate-700 font-medium">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ideal For */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <Target className="w-8 h-8 text-blue-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-blue-800 mb-2">Ideal For</h3>
                  <p className="text-blue-700">{offering.ideal}</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2C5282] rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to bring {category.title} to your school?</h3>
              <p className="text-white/80 mb-6 max-w-xl mx-auto">
                Schedule a call with our team to discuss how we can implement this program at your school.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  onClick={() => navigate('/school')}
                  className="bg-white text-[#1E3A5F] hover:bg-slate-100"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book a Meeting
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/school-offerings')}
                  className="border-white text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  View All Programs
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default SchoolOfferingDetailPage;
