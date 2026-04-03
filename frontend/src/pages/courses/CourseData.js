// Course data for SEO-optimized landing pages
export const COURSES = {
  robotics: {
    id: 'robotics',
    name: 'Robotics',
    emoji: '🤖',
    tagline: 'Build the Future with Your Hands',
    description: 'Learn to design, build, and program robots. Our hands-on robotics program develops creativity, problem-solving, and engineering skills that prepare students for the technology-driven future.',
    metaTitle: 'Robotics Classes for Kids | OLL - Learn to Build Robots',
    metaDescription: 'Join OLL\'s Robotics program. Hands-on learning for ages 6-17. Build real robots, learn programming, and develop engineering skills. Book a free demo class today!',
    heroImage: 'https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=1200',
    color: '#2563EB',
    gradient: 'from-blue-600 to-blue-800',
    ageGroups: ['6-8 years', '9-12 years', '13-16 years', '17+ years'],
    duration: '3-12 months',
    classSize: '6-8 students',
    curriculum: [
      { module: 'Fundamentals', topics: ['Introduction to Robotics', 'Basic Mechanics', 'Simple Machines', 'Sensors & Motors'] },
      { module: 'Building', topics: ['Structural Design', 'Gear Systems', 'Chassis Building', 'Component Integration'] },
      { module: 'Programming', topics: ['Block-based Coding', 'Arduino Basics', 'Sensor Programming', 'Autonomous Robots'] },
      { module: 'Projects', topics: ['Line Following Robot', 'Obstacle Avoidance', 'Remote Controlled Bot', 'Competition Prep'] }
    ],
    benefits: [
      { title: 'STEM Skills', description: 'Integrate science, technology, engineering, and math in practical projects' },
      { title: 'Problem Solving', description: 'Debug and troubleshoot real engineering challenges' },
      { title: 'Creativity', description: 'Design unique robots with your own innovative solutions' },
      { title: 'Teamwork', description: 'Collaborate with peers on complex robotics projects' }
    ],
    outcomes: [
      'Build 10+ working robot projects',
      'Compete in regional robotics competitions',
      'Understand mechanical & electronic systems',
      'Program robots using Arduino/Scratch'
    ],
    testimonials: [
      { name: 'Rohan K.', age: '12', quote: 'I built my own line-following robot! My friends were so impressed.' },
      { name: 'Ananya S.', age: '14', quote: 'The robotics program helped me win 2nd place at the state competition.' }
    ],
    faqs: [
      { q: 'Do students need prior experience?', a: 'No! Our program starts from basics and progressively builds skills.' },
      { q: 'What materials are provided?', a: 'All robotics kits, components, and tools are provided during classes.' },
      { q: 'Can students take the robots home?', a: 'Students work on our robotics kits during class. For advanced learners, we offer take-home kit programs.' }
    ]
  },
  coding: {
    id: 'coding',
    name: 'Coding',
    emoji: '💻',
    tagline: 'Code Your Ideas Into Reality',
    description: 'From block-based programming to Python and web development, our coding courses teach computational thinking and real-world programming skills through engaging projects.',
    metaTitle: 'Coding Classes for Kids | OLL - Learn Programming',
    metaDescription: 'Learn coding at OLL! Python, Scratch, Web Development for ages 6-17. Build games, apps, and websites. Expert instructors, hands-on projects. Book free demo!',
    heroImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200',
    color: '#059669',
    gradient: 'from-emerald-600 to-emerald-800',
    ageGroups: ['6-8 years', '9-12 years', '13-16 years', '17+ years'],
    duration: '3-12 months',
    classSize: '6-8 students',
    curriculum: [
      { module: 'Beginner', topics: ['Scratch Basics', 'Logic & Loops', 'Game Design', 'Animation'] },
      { module: 'Intermediate', topics: ['Python Fundamentals', 'Data Types', 'Functions', 'Simple Programs'] },
      { module: 'Advanced', topics: ['Web Development', 'HTML/CSS/JS', 'App Development', 'APIs & Databases'] },
      { module: 'Projects', topics: ['Build a Game', 'Personal Website', 'Chatbot', 'Mobile App'] }
    ],
    benefits: [
      { title: 'Logical Thinking', description: 'Develop structured thinking and problem decomposition' },
      { title: 'Creativity', description: 'Express ideas through games, apps, and digital creations' },
      { title: 'Future-Ready', description: 'Essential skill for careers in technology and beyond' },
      { title: 'Confidence', description: 'Build real projects that work and can be shared' }
    ],
    outcomes: [
      'Build 15+ coding projects',
      'Create your own games and animations',
      'Learn Python and web technologies',
      'Develop a portfolio of work'
    ],
    testimonials: [
      { name: 'Aditya M.', age: '10', quote: 'I made my own game in Scratch! Now I\'m learning Python.' },
      { name: 'Priya R.', age: '15', quote: 'The web development course helped me build my portfolio website.' }
    ],
    faqs: [
      { q: 'Which programming language do you teach first?', a: 'For younger students (6-10), we start with Scratch. Older students begin with Python.' },
      { q: 'Do students need their own computer?', a: 'For online classes, yes. For offline classes at our centers, computers are provided.' },
      { q: 'How is progress tracked?', a: 'Students complete projects at each level and receive certificates upon completion.' }
    ]
  },
  ai: {
    id: 'ai',
    name: 'AI & Machine Learning',
    emoji: '🧠',
    tagline: 'Shape the Intelligent Future',
    description: 'Explore the fascinating world of artificial intelligence and machine learning. Learn how AI works, build smart projects, and understand the technology transforming our world.',
    metaTitle: 'AI & Machine Learning Classes for Kids | OLL - Build Real AI Projects',
    metaDescription: 'AI & Machine Learning classes for kids aged 9-17 at OLL. Build chatbots, image classifiers & AI apps. Expert-led, hands-on projects. Book a free demo class!',
    heroImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200',
    color: '#7C3AED',
    gradient: 'from-violet-600 to-violet-800',
    ageGroups: ['9-12 years', '13-16 years', '17+ years'],
    duration: '4-12 months',
    classSize: '6-8 students',
    curriculum: [
      { module: 'AI Fundamentals', topics: ['What is AI?', 'Types of AI', 'AI in Daily Life', 'Ethics in AI'] },
      { module: 'Machine Learning', topics: ['How Machines Learn', 'Training Data', 'Pattern Recognition', 'Predictions'] },
      { module: 'Tools & Projects', topics: ['Teachable Machine', 'ML5.js', 'ChatGPT & LLMs', 'Image Recognition'] },
      { module: 'Advanced', topics: ['Neural Networks', 'Natural Language Processing', 'Computer Vision', 'AI App Building'] }
    ],
    benefits: [
      { title: 'Future Technology', description: 'Understand the technology driving tomorrow\'s innovations' },
      { title: 'Critical Thinking', description: 'Analyze AI capabilities and limitations' },
      { title: 'Innovation', description: 'Create AI-powered solutions to real problems' },
      { title: 'Career Advantage', description: 'AI skills are in high demand across industries' }
    ],
    outcomes: [
      'Build 8+ AI-powered projects',
      'Understand machine learning concepts',
      'Create image & voice recognition apps',
      'Train your own AI models'
    ],
    testimonials: [
      { name: 'Vikram S.', age: '15', quote: 'I trained an AI to recognize different bird species from my photos!' },
      { name: 'Sneha G.', age: '16', quote: 'Learning about AI opened my eyes to so many career possibilities.' }
    ],
    faqs: [
      { q: 'What age is appropriate for AI courses?', a: 'Our AI fundamentals course starts at age 9. Advanced ML courses are for 13+.' },
      { q: 'Do students need math skills?', a: 'Basic math is helpful but not required. We teach concepts in an accessible way.' },
      { q: 'What projects will students build?', a: 'Image classifiers, chatbots, recommendation systems, and more!' }
    ]
  },
  entrepreneurship: {
    id: 'entrepreneurship',
    name: 'Entrepreneurship',
    emoji: '💡',
    tagline: 'Turn Ideas Into Impact',
    description: 'Develop the entrepreneurial mindset and skills to create, innovate, and lead. Learn business fundamentals, design thinking, and how to turn ideas into real ventures.',
    metaTitle: 'Entrepreneurship Classes for Kids | OLL - Young Entrepreneur Program India',
    metaDescription: 'OLL Entrepreneurship program for ages 10-17. Pitch ideas, build startups & develop leadership skills. 500+ student entrepreneurs trained. Book a free demo!',
    heroImage: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200',
    color: '#EA580C',
    gradient: 'from-orange-600 to-orange-800',
    ageGroups: ['9-12 years', '13-16 years', '17+ years'],
    duration: '3-6 months',
    classSize: '8-10 students',
    curriculum: [
      { module: 'Mindset', topics: ['Entrepreneurial Thinking', 'Problem Identification', 'Opportunity Recognition', 'Growth Mindset'] },
      { module: 'Business Basics', topics: ['Business Models', 'Market Research', 'Customer Discovery', 'Revenue Streams'] },
      { module: 'Skills', topics: ['Pitching Ideas', 'Public Speaking', 'Team Building', 'Negotiation'] },
      { module: 'Execution', topics: ['MVP Development', 'Marketing Basics', 'Financial Planning', 'Launch Strategy'] }
    ],
    benefits: [
      { title: 'Leadership', description: 'Develop confidence to lead teams and projects' },
      { title: 'Innovation', description: 'Learn design thinking and creative problem solving' },
      { title: 'Communication', description: 'Master pitching, presenting, and persuasion' },
      { title: 'Real-World Skills', description: 'Apply business concepts through practical projects' }
    ],
    outcomes: [
      'Develop and pitch a startup idea',
      'Create a business plan',
      'Build a prototype or MVP',
      'Present at a demo day event'
    ],
    testimonials: [
      { name: 'Arjun P.', age: '14', quote: 'I pitched my app idea to real investors at the demo day!' },
      { name: 'Kavya N.', age: '13', quote: 'The program taught me that failure is just a step towards success.' }
    ],
    faqs: [
      { q: 'Is this program only for future business owners?', a: 'No! Entrepreneurial skills like leadership and problem-solving are valuable in any career.' },
      { q: 'Will students start real businesses?', a: 'Students develop ideas and may launch small ventures. The focus is on learning the process.' },
      { q: 'What is the demo day?', a: 'A showcase event where students pitch their ideas to parents, mentors, and sometimes investors.' }
    ]
  },
  financial: {
    id: 'financial',
    name: 'Financial Literacy',
    emoji: '💰',
    tagline: 'Master Money, Secure Your Future',
    description: 'Essential money management skills for the next generation. Learn budgeting, saving, investing basics, and how to make smart financial decisions for life.',
    metaTitle: 'Financial Literacy for Kids | OLL - Money Management',
    metaDescription: 'Teach kids about money! OLL\'s Financial Literacy program for ages 10-17. Learn saving, budgeting, investing basics. Build lifelong money skills. Book demo!',
    heroImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200',
    color: '#0891B2',
    gradient: 'from-cyan-600 to-cyan-800',
    ageGroups: ['9-12 years', '13-16 years', '17+ years'],
    duration: '2-4 months',
    classSize: '8-10 students',
    curriculum: [
      { module: 'Money Basics', topics: ['What is Money?', 'Earning vs Spending', 'Needs vs Wants', 'Smart Shopping'] },
      { module: 'Saving & Budgeting', topics: ['Goal Setting', 'Creating Budgets', 'Emergency Funds', 'Saving Strategies'] },
      { module: 'Banking & Credit', topics: ['How Banks Work', 'Interest & Compound Interest', 'Credit Basics', 'Debt Management'] },
      { module: 'Investing', topics: ['Stocks & Bonds', 'Mutual Funds', 'Risk & Return', 'Long-term Wealth Building'] }
    ],
    benefits: [
      { title: 'Life Skills', description: 'Essential knowledge for financial independence' },
      { title: 'Confidence', description: 'Make informed decisions about money' },
      { title: 'Early Habits', description: 'Build saving and investing habits young' },
      { title: 'Math Application', description: 'See real-world uses of math concepts' }
    ],
    outcomes: [
      'Create and manage a personal budget',
      'Understand banking and interest',
      'Learn investing fundamentals',
      'Participate in stock market simulation'
    ],
    testimonials: [
      { name: 'Rahul M.', age: '13', quote: 'I started saving 20% of my pocket money after this course!' },
      { name: 'Ishita K.', age: '15', quote: 'Now I understand what my parents talk about during tax season.' }
    ],
    faqs: [
      { q: 'Is this course just about saving money?', a: 'No, it covers earning, spending, saving, and investing - a complete financial education.' },
      { q: 'Do students trade real stocks?', a: 'We use simulation platforms for safe, risk-free learning.' },
      { q: 'How is this relevant for young kids?', a: 'Age-appropriate modules teach foundational concepts that grow with them.' }
    ]
  }
};

export const getCourseBySlug = (slug) => COURSES[slug];

export const getAllCourses = () => Object.values(COURSES);
