import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircleQuestion, X, Loader2, Paperclip, Mic, Square, Play, Pause, ChevronLeft, Check, CheckCircle, ExternalLink, Send, Mail, Phone, ThumbsUp, ThumbsDown, Copy } from 'lucide-react';
import { BubbleContent } from '../pages/FAQPage';
import { getVisitorId } from '../utils/visitorId';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Smart routing - show quick action buttons instead of form for certain queries
const QUICK_ACTIONS = {
  // Student pages
  student: {
    'course_info': {
      'programs': { label: 'View All Programs', link: '/student#offerings', icon: '📚' },
      'pricing': { label: 'See Pricing', link: '/student#pricing', icon: '💰' },
    },
    'demo': {
      'book_demo': { label: 'Book a Free Demo', link: '/student', icon: '🎯', scroll: 'demo-form' },
    },
  },
  // School pages
  school: {
    'partnership': {
      'program_details': { label: 'View School Offerings', link: '/schools#offerings', icon: '📚' },
      'pricing': { label: 'Get Pricing', link: '/schools#contact', icon: '💰' },
    },
    'demo': {
      'schedule_demo': { label: 'Schedule a Meeting', link: '/schools#contact', icon: '🎯' },
    },
  },
  // Educator pages
  educator: {
    'job_opportunity': {
      'openings': { label: 'See Open Positions', link: '/educator#requirements', icon: '💼' },
    },
    'application': {
      'status_check': null, // no quick action
    },
  },
  // Partner pages
  partner: {
    'partnership': {
      'center_setup': { label: 'Open a Center', link: '/centers', icon: '🏢' },
      'investment': { label: 'Partnership Details', link: '/growth-partner', icon: '📊' },
    },
    'application': {
      'apply': { label: 'Apply as Partner', link: '/growth-partner#apply', icon: '📝' },
    },
  },
  // Course pages
  course: {
    'demo': {
      'book_trial': { label: 'Book Free Trial', link: '/student', icon: '🎯' },
    },
    'course_details': {
      'curriculum': { label: 'View Curriculum', link: '/student#offerings', icon: '📖' },
    },
  },
  // General
  general: {
    'course_info': {
      'programs': { label: 'Explore Programs', link: '/offerings', icon: '📚' },
      'pricing': { label: 'See Pricing', link: '/offerings', icon: '💰' },
      'schedules': { label: 'Class Schedules', link: '/student', icon: '📅' },
    },
    'partnership': {
      'school': { label: 'School Partnership', link: '/for-schools', icon: '🏫' },
      'center': { label: 'Center / Franchise', link: '/growth-partner', icon: '🏢' },
    },
    'support': {
      'kit_issue': null, // Opens form for kit issues
      'lms': { label: 'Go to LMS', link: 'https://lms.oll.co', icon: '🎓', external: true },
      'class_issue': null, // Opens form
      'payment': null, // Opens form
    },
    'opportunities': {
      'join_team': { label: 'Join OLL Team', link: '/join-team', icon: '👥' },
      'educator': { label: 'Become an Educator', link: '/educator', icon: '👨‍🏫' },
    },
  },
};

// Page-specific query types - Logged-in users get simplified options
const LOGGED_IN_USER_QUERIES = {
  label: 'How can we help?',
  queries: [
    { 
      value: 'demo_related', label: 'Demo Related', icon: '🎯',
      subCategories: [
        { value: 'demo_link', label: 'Demo Link Issue' },
        { value: 'reschedule', label: 'Reschedule Demo' },
        { value: 'update_booking', label: 'Update Booking' },
        { value: 'other', label: 'Other' },
      ]
    },
    { 
      value: 'ongoing_classes', label: 'Ongoing Classes', icon: '📚',
      subCategories: [
        { value: 'online_class', label: 'Online Class Issue' },
        { value: 'offline_home', label: 'At Home Class Issue' },
        { value: 'center_class', label: 'At Center Issue' },
        { value: 'schedule_change', label: 'Schedule Change' },
        { value: 'other', label: 'Other' },
      ]
    },
    { 
      value: 'school_program', label: 'School Program', icon: '🏫',
      subCategories: [
        { value: 'class_issue', label: 'Class Issue' },
        { value: 'teacher_feedback', label: 'Teacher Feedback' },
        { value: 'kit_issue', label: 'Kit / Material Issue' },
        { value: 'other', label: 'Other' },
      ]
    },
    { 
      value: 'other', label: 'Other Query', icon: '❓',
      subCategories: [
        { value: 'payment', label: 'Payment Related' },
        { value: 'feedback', label: 'Feedback' },
        { value: 'complaint', label: 'Complaint' },
        { value: 'general', label: 'General Question' },
      ]
    },
  ]
};

// Page-specific query configs
const PAGE_QUERY_CONFIG = {
  // Student/Parent pages
  student: {
    label: 'Student / Parent',
    queries: [
      { 
        value: 'course_info', label: 'Course & Programs', icon: '📚',
        subCategories: [
          { value: 'course_content', label: 'Course Content' },
          { value: 'course_pricing', label: 'Pricing & Fees' },
          { value: 'course_schedule', label: 'Schedule & Timing' },
          { value: 'age_eligibility', label: 'Age & Eligibility' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'demo', label: 'Demo & Trial', icon: '🎯',
        subCategories: [
          { value: 'book_demo', label: 'Book a Demo' },
          { value: 'reschedule', label: 'Reschedule Demo' },
          { value: 'demo_issue', label: 'Demo Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'payment', label: 'Payment & Fees', icon: '💳',
        subCategories: [
          { value: 'fee_structure', label: 'Fee Structure' },
          { value: 'payment_issue', label: 'Payment Issue' },
          { value: 'refund', label: 'Refund Request' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'complaint', label: 'Complaint' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // School pages - More specific to what schools ask
  school: {
    label: 'School Partnership',
    queries: [
      { 
        value: 'partnership', label: 'Partnership Inquiry', icon: '🏫',
        subCategories: [
          { value: 'program_details', label: 'Program Details' },
          { value: 'pricing', label: 'Pricing & Packages' },
          { value: 'implementation', label: 'How It Works' },
          { value: 'pilot_program', label: 'Pilot Program' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'demo', label: 'Schedule Demo', icon: '🎯',
        subCategories: [
          { value: 'schedule_demo', label: 'Book Demo' },
          { value: 'reschedule', label: 'Reschedule' },
          { value: 'virtual_demo', label: 'Virtual Demo' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'existing_partner', label: 'Existing Partner', icon: '🤝',
        subCategories: [
          { value: 'kit_delivery', label: 'Kit Delivery' },
          { value: 'teacher_training', label: 'Teacher Training' },
          { value: 'technical', label: 'Technical Support' },
          { value: 'renewal', label: 'Renewal Query' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // Educator pages
  educator: {
    label: 'Educator / Teacher',
    queries: [
      { 
        value: 'job_opportunity', label: 'Job Opportunities', icon: '💼',
        subCategories: [
          { value: 'openings', label: 'Current Openings' },
          { value: 'eligibility', label: 'Eligibility' },
          { value: 'salary', label: 'Compensation' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'application', label: 'Application', icon: '📋',
        subCategories: [
          { value: 'status_check', label: 'Check Status' },
          { value: 'update_application', label: 'Update Application' },
          { value: 'documents', label: 'Documents' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'training', label: 'Training', icon: '🎓',
        subCategories: [
          { value: 'training_schedule', label: 'Schedule' },
          { value: 'materials', label: 'Materials' },
          { value: 'certification', label: 'Certification' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // Course landing pages (robotics, coding, etc.)
  course: {
    label: 'Course Inquiry',
    queries: [
      { 
        value: 'course_details', label: 'Course Details', icon: '📚',
        subCategories: [
          { value: 'curriculum', label: 'Curriculum & Syllabus' },
          { value: 'duration', label: 'Duration & Schedule' },
          { value: 'age_group', label: 'Age Group' },
          { value: 'prerequisites', label: 'Prerequisites' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'pricing', label: 'Pricing & Enrollment', icon: '💰',
        subCategories: [
          { value: 'fee_structure', label: 'Fee Structure' },
          { value: 'discounts', label: 'Discounts & Offers' },
          { value: 'payment_options', label: 'Payment Options' },
          { value: 'enrollment', label: 'How to Enroll' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'demo', label: 'Free Trial / Demo', icon: '🎯',
        subCategories: [
          { value: 'book_trial', label: 'Book Free Trial' },
          { value: 'trial_info', label: 'Trial Information' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'batches', label: 'Batch Timings' },
          { value: 'locations', label: 'Locations' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // Growth Partner / Centers pages
  partner: {
    label: 'Partnership',
    queries: [
      { 
        value: 'partnership', label: 'Partnership Info', icon: '🤝',
        subCategories: [
          { value: 'center_setup', label: 'Center Setup' },
          { value: 'investment', label: 'Investment' },
          { value: 'requirements', label: 'Requirements' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'application', label: 'Application', icon: '📋',
        subCategories: [
          { value: 'apply', label: 'Apply Now' },
          { value: 'status', label: 'Check Status' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // School Student Payment page - Payment specific FAQs
  'school-payment': {
    label: 'Payment Help',
    queries: [
      { 
        value: 'payment_methods', label: 'Payment Methods', icon: '💳',
        subCategories: [
          { value: 'accepted_cards', label: 'Cards, UPI, Net Banking, Wallets accepted' },
          { value: 'upi', label: 'UPI Payment Help' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'payment_security', label: 'Payment Security', icon: '🔒',
        subCategories: [
          { value: 'is_secure', label: 'Is payment secure?' },
          { value: 'data_protection', label: 'Card details protection' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'receipt', label: 'Receipt & Confirmation', icon: '🧾',
        subCategories: [
          { value: 'get_receipt', label: 'How to get receipt?' },
          { value: 'no_receipt', label: 'Did not receive receipt' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'payment_failed', label: 'Payment Failed', icon: '❌',
        subCategories: [
          { value: 'retry_payment', label: 'How to retry payment?' },
          { value: 'amount_deducted', label: 'Amount deducted but failed' },
          { value: 'refund_time', label: 'Refund timeline (5-7 days)' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'installments', label: 'Installment Options', icon: '📅',
        subCategories: [
          { value: 'emi_available', label: 'Is EMI available?' },
          { value: 'partial_payment', label: 'Can I pay in parts?' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other Query', icon: '❓',
        subCategories: [
          { value: 'contact_school', label: 'Contact School' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // Admin pages
  admin: {
    label: 'Admin Support',
    queries: [
      { 
        value: 'technical', label: 'Technical Issue', icon: '🔧',
        subCategories: [
          { value: 'page_error', label: 'Page Error' },
          { value: 'data_issue', label: 'Data Issue' },
          { value: 'feature_bug', label: 'Feature Bug' },
          { value: 'slow_loading', label: 'Slow Loading' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'feature_request', label: 'Feature Request', icon: '💡',
        subCategories: [
          { value: 'new_feature', label: 'New Feature' },
          { value: 'improvement', label: 'Improvement' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'data_help', label: 'Data Help', icon: '📊',
        subCategories: [
          { value: 'export', label: 'Export Help' },
          { value: 'import', label: 'Import Help' },
          { value: 'report', label: 'Report Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'general', label: 'General' },
        ]
      },
    ]
  },
  
  // Father's Day Workshop / 1-day events
  workshop: {
    label: "Father's Day Workshop · Help",
    queries: [
      {
        value: 'enrollment', label: 'Enrollment & Booking', icon: '🎟️',
        subCategories: [
          { value: 'how_to_enroll',    label: 'How to enroll' },
          { value: 'age_eligibility',  label: 'Age eligibility (4 – 12)' },
          { value: 'multiple_kids',    label: 'Bring more than one child' },
          { value: 'group_booking',    label: 'Group / friends booking' },
          { value: 'corporate_gift',   label: 'Corporate / gift voucher' },
          { value: 'other',            label: 'Other' },
        ],
      },
      {
        value: 'workshop_request', label: 'Different city / area / date', icon: '📍',
        subCategories: [
          { value: 'different_city',    label: 'Need workshop in a different city' },
          { value: 'different_area',    label: 'Need workshop in a different area of Mumbai' },
          { value: 'different_date',    label: 'Need a different date' },
          { value: 'different_timing',  label: 'Need a different time slot' },
          { value: 'private_session',   label: 'Private / home session' },
          { value: 'school_booking',    label: 'Book this for our school' },
          { value: 'other',             label: 'Other custom request' },
        ],
      },
      {
        value: 'event_details', label: 'About the workshop', icon: '🤖',
        subCategories: [
          { value: 'what_to_bring',     label: 'What should we bring?' },
          { value: 'what_kids_build',   label: 'What will my child build?' },
          { value: 'parent_skill',      label: 'Do parents need any skill?' },
          { value: 'take_home',         label: 'What do we take home?' },
          { value: 'food_breaks',       label: 'Food / snacks / breaks' },
          { value: 'duration',          label: 'Duration & schedule' },
          { value: 'other',             label: 'Other' },
        ],
      },
      {
        value: 'payment', label: 'Payment & Refund', icon: '💳',
        subCategories: [
          { value: 'pricing',           label: 'Pricing & extra-child fee' },
          { value: 'payment_failed',    label: 'Payment failed / retry' },
          { value: 'refund',            label: 'Refund / cancellation' },
          { value: 'receipt',           label: 'Receipt / invoice' },
          { value: 'other',             label: 'Other' },
        ],
      },
      {
        value: 'other', label: 'Other Question', icon: '❓',
        subCategories: [
          { value: 'reschedule',  label: 'Reschedule my booking' },
          { value: 'feedback',    label: 'Feedback' },
          { value: 'general',     label: 'General question' },
        ],
      },
    ],
  },

  // Techfest × OLL Robotics Championship — /techfest and /techfest/register
  techfest: {
    label: 'OLL × Techfest IIT Bombay · Help',
    queries: [
      {
        value: 'registration', label: 'Registration & Eligibility', icon: '📝',
        subCategories: [
          { value: 'how_to_register',      label: 'How do I register?' },
          { value: 'individual_vs_team',   label: 'Individual vs Team registration' },
          { value: 'school_registration',  label: 'Register my whole school' },
          { value: 'educator_registration',label: 'Register as an Educator / Mentor' },
          { value: 'age_grades',           label: 'Which grades can participate?' },
          { value: 'more_than_one',        label: 'Can a student join more than 1 track?' },
          { value: 'confirmation',         label: 'I registered but got no confirmation' },
          { value: 'other',                label: 'Other' },
        ],
      },
      {
        value: 'tracks_rounds', label: 'Tracks & Rounds', icon: '🏆',
        subCategories: [
          { value: 'which_track',          label: 'Which track should we pick?' },
          { value: 'sumo_racer_rounds',    label: 'RoboSumo / RoboRacer — rounds & format' },
          { value: 'ric_rounds',           label: 'Robotics Innovation Challenge — rounds' },
          { value: 'rubric',               label: 'Judging rubric details' },
          { value: 'submission_format',    label: 'Online submission format & deadlines' },
          { value: 'other',                label: 'Other' },
        ],
      },
      {
        value: 'kits', label: 'RoboSumo / RoboRacer Kits', icon: '🤖',
        subCategories: [
          { value: 'mandatory',            label: 'Is the OLL kit mandatory?' },
          { value: 'bulk_school',          label: 'Bulk order for our school' },
          { value: 'shipping',             label: 'Delivery time & shipping charges' },
          { value: 'pickup',               label: 'Can we pick up from OLL office?' },
          { value: 'kit_contents',         label: 'What comes inside the kit?' },
          { value: 'other',                label: 'Other' },
        ],
      },
      {
        value: 'regionals', label: 'Regional Qualifier & Grand Finale', icon: '📍',
        subCategories: [
          { value: 'my_city',              label: 'Which city hosts my regional qualifier?' },
          { value: 'venue_dates',          label: 'Regional venue & date' },
          { value: 'finale_iitb',          label: 'Grand Finale at IIT Bombay — dates & schedule' },
          { value: 'travel_stay',          label: 'Travel & accommodation for the finale' },
          { value: 'other',                label: 'Other' },
        ],
      },
      {
        value: 'prizes_fees', label: 'Prizes, Fees & Certificates', icon: '🏅',
        subCategories: [
          { value: 'fee',                  label: 'Is there a registration fee?' },
          { value: 'prize_split',          label: 'Prize money breakdown (upto ₹1,50,000)' },
          { value: 'certificates',         label: 'Certificates for participants' },
          { value: 'other',                label: 'Other' },
        ],
      },
      {
        value: 'other', label: 'Other Question', icon: '❓',
        subCategories: [
          { value: 'general',              label: 'General question' },
          { value: 'partnership',          label: 'Partnership / sponsorship enquiry' },
          { value: 'media',                label: 'Media / press enquiry' },
          { value: 'feedback',             label: 'Feedback / suggestion' },
        ],
      },
    ],
  },

  // Summer Camp page - specific to camp bookings & queries
  summer_camp: {
    label: 'Summer Camp Help',
    queries: [
      { 
        value: 'camp_registration', label: 'Registration & Booking', icon: '📋',
        subCategories: [
          { value: 'how_to_book', label: 'How to Book a Seat' },
          { value: 'batch_availability', label: 'Batch Availability' },
          { value: 'center_location', label: 'Center Location / Address' },
          { value: 'age_eligibility', label: 'Age Eligibility' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'batch_timing', label: 'Batch & Timings', icon: '⏰',
        subCategories: [
          { value: 'timing_4_8', label: 'Timings for Ages 4–8' },
          { value: 'timing_9_12', label: 'Timings for Ages 9–12' },
          { value: 'timing_13_16', label: 'Timings for Ages 13–16' },
          { value: 'reschedule', label: 'Change Batch / Reschedule' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'fee_payment', label: 'Fee & Payment', icon: '💳',
        subCategories: [
          { value: 'fee_structure', label: 'Fee Structure' },
          { value: 'payment_issue', label: 'Payment Not Confirmed' },
          { value: 'refund', label: 'Refund Request' },
          { value: 'group_discount', label: 'Sibling / Group Discount' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'camp_query', label: 'Camp Activities', icon: '🤖',
        subCategories: [
          { value: 'curriculum', label: 'What Will My Child Learn?' },
          { value: 'laptop', label: 'Do They Need a Laptop?' },
          { value: 'materials', label: 'Materials / Kit Provided' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other Query', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'complaint', label: 'Complaint' },
          { value: 'general', label: 'General Question' },
        ]
      },
    ]
  },
  
  // Default/General - Home page options
  general: {
    label: 'How can we help?',
    queries: [
      { 
        value: 'course_info', label: 'Course Information', icon: '📚',
        subCategories: [
          { value: 'programs', label: 'View All Programs' },
          { value: 'pricing', label: 'Pricing & Fees' },
          { value: 'schedules', label: 'Class Schedules' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'partnership', label: 'Partnership Opportunities', icon: '🤝',
        subCategories: [
          { value: 'school', label: 'School Partnership' },
          { value: 'center', label: 'Center Partnership / Franchise' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'support', label: 'Existing Customer Support', icon: '🛠️',
        subCategories: [
          { value: 'kit_issue', label: 'Missing / Damaged Kit' },
          { value: 'lms', label: 'LMS Login Help' },
          { value: 'class_issue', label: 'Class / Schedule Issue' },
          { value: 'payment', label: 'Payment Query' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'opportunities', label: 'Join OLL', icon: '💼',
        subCategories: [
          { value: 'join_team', label: 'Join OLL Team' },
          { value: 'educator', label: 'Become an Educator' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
};

// Get page config based on URL
const getPageConfig = (path, isLoggedIn) => {
  // PRIORITY 0: Techfest campaign & register page — dedicated FAQ list
  if (path.includes('/techfest')) {
    return PAGE_QUERY_CONFIG.techfest;
  }

  // PRIORITY 1: School student payment page - ALWAYS show payment FAQs regardless of login
  // This must be checked first since payment page users need payment-specific help
  if (path.includes('/school-pay')) {
    return PAGE_QUERY_CONFIG['school-payment'];
  }

  // PRIORITY 1b: Workshop / 1-day event pages — specific event FAQs
  if (path.includes('/workshops/') || path.includes('/workshop/')) {
    return PAGE_QUERY_CONFIG.workshop;
  }

  // PRIORITY 2: Summer camp pages - specific camp FAQs
  if (path.includes('/summer-camp')) {
    return PAGE_QUERY_CONFIG.summer_camp;
  }
  
  // PRIORITY 3: Course landing pages (also public, need specific FAQs)
  if (path.includes('/robotics') || path.includes('/coding') || path.includes('/ai') || 
      path.includes('/course') || path.includes('/program')) {
    return PAGE_QUERY_CONFIG.course;
  }
  
  // For logged-in regular users (not admin), show simplified queries
  if (isLoggedIn && !path.includes('/admin')) {
    return LOGGED_IN_USER_QUERIES;
  }
  
  if (path.includes('/admin')) return PAGE_QUERY_CONFIG.admin;
  if (path.includes('/student')) return PAGE_QUERY_CONFIG.student;
  if (path.includes('/school')) return PAGE_QUERY_CONFIG.school;
  if (path.includes('/educator')) return PAGE_QUERY_CONFIG.educator;
  if (path.includes('/centers') || path.includes('/growth-partner')) return PAGE_QUERY_CONFIG.partner;
  return PAGE_QUERY_CONFIG.general;
};

// Get page type key for quick actions lookup
const getPageTypeKey = (path) => {
  if (path.includes('/techfest')) return 'techfest';
  if (path.includes('/workshops/') || path.includes('/workshop/')) return 'workshop';
  if (path.includes('/robotics') || path.includes('/coding') || path.includes('/ai') || 
      path.includes('/course') || path.includes('/program')) return 'course';
  if (path.includes('/school-pay')) return 'school-payment';
  if (path.includes('/admin')) return 'admin';
  if (path.includes('/student')) return 'student';
  if (path.includes('/school')) return 'school';
  if (path.includes('/educator')) return 'educator';
  if (path.includes('/centers') || path.includes('/growth-partner')) return 'partner';
  return 'general';
};

// Map page type → inquiry_type used by Admin Support Center filter
// Keeps admin "User Type" filter useful instead of dumping everything in 'general'
const getInquiryTypeForPage = (path) => {
  if (path.includes('/techfest')) return 'school';
  if (path.includes('/educator')) return 'teacher';
  if (path.includes('/centers') || path.includes('/growth-partner')) return 'growth_partner';
  if (path.includes('/admin')) return 'team';
  if (path.includes('/school-pay') || path.includes('/school')) return 'school';
  if (path.includes('/track')) return 'school';
  // Student-facing landing pages, courses, summer camp, future skills, payment FAQs etc
  return 'student';
};

const RaiseQueryButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [quickAction, setQuickAction] = useState(null); // For smart routing

  // ── AI FAQ chat mode (default when the help popup opens) ────────────────
  // Shows an inline AI chat (same /api/faq-chat engine as /faq) with a
  // persistent footer giving the visitor Raise-Ticket / WhatsApp / Email.
  // Clicking "Raise Ticket" switches to the existing 4-step wizard.
  const [mode, setMode] = useState('chat');        // 'chat' | 'wizard'
  const [chatSessionId] = useState(() => `nh-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: "Hi 👋 I'm OLL's AI help bot. Ask me anything about courses, Techfest, payments, our programs — or tap **Raise a Ticket** below to talk to a human.", isGreeting: true },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState([]);
  // Fetch admin-curated suggestion chips once when the component mounts;
  // these render just above the composer so visitors can tap a question
  // instead of typing (mirrors the /faq page UX, requested on mobile).
  React.useEffect(() => {
    const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
    fetch(`${API_BASE}/faq-chat/suggestions`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setChatSuggestions((d?.suggestions || []).slice(0, 6)))
      .catch(() => {});
  }, []);
  const chatBottomRef = React.useRef(null);
  const lastAssistantRef = React.useRef(null);
  // Voice input for the popup composer — same cumulative-buffer hook as
  // the /faq page so dictation never "replaces itself" on silent pauses.
  const {
    isListening: chatListening,
    toggle: toggleChatVoice,
    voiceSupported: chatVoiceSupported,
  } = useVoiceInput({ getBaseText: () => chatInput, setText: setChatInput });
  // When a user sends a message, scroll to bottom so they can see their
  // bubble + the "Thinking…" indicator. When the AI reply lands, scroll
  // so the TOP of that answer is visible (users complained the chat kept
  // jumping to the bottom of long answers, so they lost context).
  React.useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (!last) return;
    if (chatSending || last.role === 'user') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else if (last.role === 'assistant' && !last.isGreeting && lastAssistantRef.current) {
      lastAssistantRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [chatMessages, chatSending]);

  const sendChatMessage = async (overrideText) => {
    const text = ((overrideText != null ? overrideText : chatInput) || '').trim();
    if (!text || chatSending) return;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text }]);
    setChatSending(true);
    try {
      const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
      const res = await fetch(`${API_BASE}/faq-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Visitor-Id': getVisitorId() },
        body: JSON.stringify({ message: text, session_id: chatSessionId }),
      });
      const data = await res.json();
      const reply = data?.reply || "Sorry, I couldn't fetch an answer. Please try again or raise a ticket below.";
      setChatMessages((prev) => [...prev, { role: 'assistant', text: reply, source: data?.source, feedback: null }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'Network error — please try again or raise a ticket below.', feedback: null }]);
    } finally {
      setChatSending(false);
    }
  };

  // Thumbs up/down on an assistant message. Fire-and-forget to the FAQ
  // feedback endpoint; local state collapses the thumbs bar to "Thanks".
  const markChatFeedback = (idx, verdict) => {
    setChatMessages((prev) => prev.map((m, i) => i === idx ? { ...m, feedback: verdict } : m));
    try {
      const lastUserQ = chatMessages.slice(0, idx).reverse().find((x) => x.role === 'user')?.text || '';
      const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
      fetch(`${API_BASE}/faq-chat/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: chatSessionId, verdict, question: lastUserQ }),
      }).catch(() => {});
    } catch {}
  };

  const WA_NUMBER = '919920188188';
  const SUPPORT_EMAIL = 'info@oll.co';
  
  const [formData, setFormData] = useState({
    query_type: '',
    related_to: '',
    message: '',
    name: '',
    phone: '',
    email: '',
  });
  
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordTime, setRecordTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);
  const timerRef = React.useRef(null);

  // Use location.pathname to get current path reactively
  const currentPath = location.pathname;

  // Hide on AI Chat page — prevents floating button from overlapping the chat send button
  if (currentPath === '/admin/ai-chat') return null;
  if (currentPath === '/admin/live') return null;
  // Hide on Summer Camp page on mobile (handled via CSS injected by the page)

  // Check auth state
  const checkAuth = () => {
    const token = localStorage.getItem('oll_token');
    if (token) {
      const storedUser = localStorage.getItem('oll_user');
      let user = null;
      if (storedUser) {
        try { user = JSON.parse(storedUser); } catch (e) { /* ignore parse error */ }
      }
      return { isLoggedIn: true, userData: user };
    }
    return { isLoggedIn: false, userData: null };
  };

  const pageConfig = getPageConfig(currentPath, isLoggedIn);
  const selectedQueryType = pageConfig.queries.find(q => q.value === formData.query_type);
  // Always 4 steps - contact info is mandatory for all users
  // For logged-in users, contact info is auto-filled
  const totalSteps = 4;

  const handleOpen = () => {
    const auth = checkAuth();
    setIsLoggedIn(auth.isLoggedIn);
    setUserData(auth.userData);
    setSubmitted(false);
    setQuickAction(null);
    
    setFormData({
      query_type: '',
      related_to: '',
      message: '',
      name: auth.userData?.name || auth.userData?.full_name || '',
      phone: auth.userData?.phone || '',
      email: auth.userData?.email || '',
    });
    setAttachments([]);
    setAudioBlob(null);
    setAudioUrl(null);
    setStep(1);
    setMode('chat');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep(1);
    setMode('chat');
    setSubmitted(false);
    setQuickAction(null);
  };

  // Auto-advance when selecting category
  const handleCategorySelect = (value) => {
    setFormData({ ...formData, query_type: value, related_to: '' });
    setQuickAction(null);
    setStep(2);
  };

  // Auto-advance when selecting sub-category - check for quick action
  const handleSubCategorySelect = (value) => {
    setFormData({ ...formData, related_to: value });
    
    // Check if there's a quick action for this selection
    const pageType = getPageTypeKey(currentPath);
    const actions = QUICK_ACTIONS[pageType];
    if (actions && actions[formData.query_type] && actions[formData.query_type][value]) {
      setQuickAction(actions[formData.query_type][value]);
    } else {
      setQuickAction(null);
    }
    setStep(3);
  };

  // Handle quick action navigation
  const handleQuickAction = () => {
    if (quickAction?.link) {
      handleClose();
      const [path, hash] = quickAction.link.split('#');
      navigate(path);
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch (err) {
      toast.error('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await axios.post(`${API}/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setAttachments(prev => [...prev, { name: file.name, url: res.data.url, type: file.type }]);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!formData.message.trim()) {
      toast.error('Please describe your query');
      return;
    }

    setLoading(true);
    try {
      let allAttachments = [...attachments];
      if (audioBlob) {
        const fd = new FormData();
        fd.append('file', audioBlob, 'voice-note.webm');
        const uploadRes = await axios.post(`${API}/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        allAttachments.push({ name: 'Voice Note', url: uploadRes.data.url, type: 'audio/webm', isVoiceNote: true });
      }

      const queryTypeLabel = selectedQueryType?.label || 'General Query';
      const subCategoryLabel = selectedQueryType?.subCategories?.find(s => s.value === formData.related_to)?.label || '';

      // Techfest routing — collapse the two-level Need Help selection into the
      // admin Support Center's `techfest` category + one of its slugs so the
      // ticket lands cleanly under the Techfest filter. Keep the human labels
      // in the message body so context isn't lost.
      const TECHFEST_TOPLEVEL_TO_SLUG = {
        registration:  'registration_query',
        tracks_rounds: 'tracks_rounds',
        kits:          'kits',
        regionals:     'regionals',
        prizes_fees:   'prizes_fees',
      };
      const isTechfest = currentPath.includes('/techfest');
      let payloadQueryType = queryTypeLabel;
      let payloadRelatedTo = subCategoryLabel;
      let messageBody = formData.message;
      if (isTechfest) {
        // Map "other" branch's sub-values to sponsorship/media/feedback so
        // partnership + press queries flow to the right sub-category.
        let mapped = TECHFEST_TOPLEVEL_TO_SLUG[formData.query_type];
        if (!mapped && formData.query_type === 'other') {
          const sub = formData.related_to;
          if (sub === 'partnership')      mapped = 'sponsorship';
          else if (sub === 'media')       mapped = 'media';
          else if (sub === 'feedback')    mapped = 'feedback';
          else if (sub === 'confirmation')mapped = 'confirmation';
          else                            mapped = 'other';
        }
        payloadQueryType = 'techfest';
        payloadRelatedTo = mapped || 'other';
        // Prepend the two-level Need Help context so agents see what the user
        // actually selected even though we normalised the tags.
        messageBody = `[${queryTypeLabel}${subCategoryLabel ? ' → ' + subCategoryLabel : ''}]\n${formData.message}`;
      }

      await axios.post(`${API}/inquiry/query`, {
        inquiry_type: getInquiryTypeForPage(currentPath),
        action_type: 'query',
        name: formData.name || userData?.name || 'Anonymous',
        phone: formData.phone || userData?.phone || '',
        email: formData.email || userData?.email || '',
        query_type: payloadQueryType,
        related_to: payloadRelatedTo,
        query_details: messageBody,
        priority: 'normal',
        source: `quick_help${currentPath.replace(/\//g, '_').substring(0, 40)}`,
        page_context: pageConfig.label,
        attachments: allAttachments,
      });

      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Validate name and phone are required
  const canSubmit = () => {
    return formData.message.trim().length > 0 && 
           formData.name.trim().length > 0 && 
           formData.phone.trim().length >= 10;
  };

  const handleNext = () => {
    if (step === 3) {
      // Go to contact info step
      setStep(4);
    } else if (step === 4) {
      // Validate before submit
      if (!formData.name.trim()) {
        toast.error('Please enter your name');
        return;
      }
      if (!formData.phone.trim() || formData.phone.length < 10) {
        toast.error('Please enter a valid phone number');
        return;
      }
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  // Get fresh page config when logged in state changes
  const currentPageConfig = getPageConfig(currentPath, isLoggedIn);

  return (
    <>
      {/* Sticky Button - Dark blue with white text/icon */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 
          bg-[#1E3A5F] backdrop-blur-lg 
          text-white rounded-full shadow-lg 
          hover:bg-[#2d5a8a] hover:shadow-xl hover:scale-105
          transition-all duration-300 raise-query-btn raise-query-btn-faq-safe"
        data-testid="raise-query-btn"
      >
        <MessageCircleQuestion className="w-5 h-5" />
        <span className="font-medium text-sm">Need Help?</span>
      </button>

      {/* Query Dialog - hide default close button with [&>button]:hidden */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={`p-0 overflow-hidden bg-white rounded-2xl [&>button]:hidden ${step === 1 ? 'max-w-sm' : 'max-w-md'}`}>
          <DialogTitle className="sr-only">Need Help?</DialogTitle>
          
          {/* Success Animation */}
          {submitted ? (
            <div className="p-8 flex flex-col items-center justify-center min-h-[250px]">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Query Submitted!</h3>
              <p className="text-sm text-slate-500 text-center">Our team will get back to you soon.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2d5a8a] p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <MessageCircleQuestion className="w-4 h-4" />
                    {mode === 'chat' ? 'OLL Help · Ask Anything' : (step === 1 ? 'How can we help?' : currentPageConfig.label)}
                  </h2>
                  <button onClick={handleClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors" data-testid="need-help-close">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Steps — only in wizard mode */}
                {mode === 'wizard' && (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <React.Fragment key={i}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        step > i + 1 ? 'bg-green-400 text-white' :
                        step === i + 1 ? 'bg-white text-[#1E3A5F]' :
                        'bg-white/20 text-white/60'
                      }`}>
                        {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      {i < totalSteps - 1 && (
                        <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-green-400' : 'bg-white/20'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                )}
              </div>

              {/* ── AI CHAT MODE (default) ──────────────────────────── */}
              {mode === 'chat' && (
                <>
                  <div className="p-3 h-[380px] overflow-y-auto bg-slate-50/60 flex flex-col gap-2.5" data-testid="need-help-chat-messages">
                    {chatMessages.map((m, i) => {
                      const isLastAssistant =
                        m.role === 'assistant' &&
                        !m.isGreeting &&
                        i === chatMessages.length - 1;
                      const copyAnswer = async () => {
                        try {
                          const plain = String(m.text || '')
                            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
                            .replace(/[*_`#>]+/g, '')
                            .trim();
                          await navigator.clipboard.writeText(plain);
                          toast.success('Answer copied');
                        } catch {
                          toast.error('Could not copy — long-press to select instead.');
                        }
                      };
                      return (
                      <div
                        key={i}
                        ref={isLastAssistant ? lastAssistantRef : null}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${m.role === 'assistant' ? 'flex-col items-start' : ''}`}
                      >
                        <div className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'bg-[#1E3A5F] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm w-full'}`}>
                          {/* BubbleContent handles markdown, clickable links,
                              product-card hydration AND YouTube iframe render.
                              The React.memo on `content` keeps the hydrated
                              card alive across thumbs-up/down re-renders. */}
                          <BubbleContent content={m.text} isUser={m.role === 'user'} />
                          {m.source && m.role === 'assistant' && (
                            <div className="text-[9px] uppercase tracking-widest mt-1.5 opacity-60">
                              {m.source === 'pre_canned' ? 'Instant answer' : m.source === 'cache' ? 'Cached' : 'AI'}
                            </div>
                          )}
                        </div>
                        {/* Thumbs + Copy under every assistant answer */}
                        {m.role === 'assistant' && !m.isGreeting && (
                          <div className="mt-1 pl-1 flex items-center gap-1 flex-wrap">
                            {m.feedback == null ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => markChatFeedback(i, 'up')}
                                  className="p-1 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                                  title="Helpful"
                                  data-testid={`need-help-msg-${i}-thumbs-up`}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markChatFeedback(i, 'down')}
                                  className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                  title="Not helpful"
                                  data-testid={`need-help-msg-${i}-thumbs-down`}
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-500 italic">
                                {m.feedback === 'up' ? '👍 Thanks for the feedback' : '👎 Thanks — we\'ll improve this'}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={copyAnswer}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-[#1E3A5F] bg-slate-100 hover:bg-slate-200 rounded-full px-2 py-0.5 transition ml-auto"
                              title="Copy answer"
                              data-testid={`need-help-msg-${i}-copy`}
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          </div>
                        )}
                      </div>
                      );
                    })}
                    {chatSending && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 text-sm text-slate-500 italic rounded-bl-sm">
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Suggestion chips — show only until the visitor has sent
                      their first question. After that we hide them to free
                      vertical space on mobile. */}
                  {chatSuggestions.length > 0 && !chatMessages.some((m) => m.role === 'user') && (
                    <div className="px-2.5 pt-2 pb-1 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar" data-testid="need-help-suggestions">
                      {chatSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => sendChatMessage(s)}
                          disabled={chatSending}
                          className="flex-shrink-0 text-[11px] font-medium text-[#1E3A5F] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-3 py-1.5 whitespace-nowrap transition disabled:opacity-50"
                          data-testid={`need-help-suggestion-${i}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Composer */}
                  <div className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                      placeholder={chatListening ? 'Listening — speak now…' : 'Ask about Techfest, courses, payments…'}
                      className="flex-1 h-9 px-3 text-sm rounded-full border border-slate-200 focus:outline-none focus:border-[#1E3A5F]"
                      data-testid="need-help-chat-input"
                      disabled={chatSending}
                    />
                    {chatVoiceSupported && (
                      <button
                        type="button"
                        onClick={toggleChatVoice}
                        disabled={chatSending}
                        aria-label={chatListening ? 'Stop voice input' : 'Start voice input'}
                        title={chatListening ? 'Stop voice input' : 'Start voice input'}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-40 ${chatListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        data-testid="need-help-chat-mic"
                      >
                        {chatListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => sendChatMessage()}
                      disabled={!chatInput.trim() || chatSending}
                      className="w-9 h-9 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#2d5a8a]"
                      data-testid="need-help-chat-send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Persistent footer: Raise Ticket · WhatsApp · Email */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-100 border-t border-slate-200" data-testid="need-help-footer-actions">
                    <button
                      type="button"
                      onClick={() => setMode('wizard')}
                      className="h-10 rounded-lg bg-[#FF6B35] hover:bg-[#e85d2a] text-white text-xs font-bold inline-flex items-center justify-center gap-1 transition"
                      data-testid="need-help-raise-ticket"
                    >
                      <MessageCircleQuestion className="w-3.5 h-3.5" /> Raise a Ticket
                    </button>
                    <a
                      href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi OLL team, I need help with ')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-10 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold inline-flex items-center justify-center gap-1 transition"
                      data-testid="need-help-whatsapp"
                    >
                      <Phone className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Need help — OLL')}`}
                      className="h-10 rounded-lg bg-[#1E3A5F] hover:bg-[#2d5a8a] text-white text-xs font-bold inline-flex items-center justify-center gap-1 transition"
                      data-testid="need-help-email"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                  </div>
                </>
              )}

              {/* ── WIZARD MODE (click "Raise a Ticket" to enter) ──── */}
              {mode === 'wizard' && (
              <>
              {/* Step Content */}
              <div className={`p-4 ${step === 1 ? 'min-h-[180px]' : 'min-h-[240px]'}`}>
                {/* Step 1: Select Query Type */}
                {step === 1 && (
                  <div className="space-y-2">
                    {currentPageConfig.queries.map(type => (
                      <button
                        key={type.value}
                        onClick={() => handleCategorySelect(type.value)}
                        className="w-full p-3 rounded-xl border-2 border-slate-200 hover:border-[#FF6B35] hover:bg-orange-50 
                          text-left transition-all flex items-center gap-3"
                      >
                        <span className="text-xl">{type.icon}</span>
                        <span className="text-sm font-medium text-slate-800">{type.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 2: Select Sub-category */}
                {step === 2 && selectedQueryType && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <span className="text-xl">{selectedQueryType.icon}</span>
                      <span className="text-sm font-medium text-slate-700">{selectedQueryType.label}</span>
                    </div>
                    {selectedQueryType.subCategories.map(sub => (
                      <button
                        key={sub.value}
                        onClick={() => handleSubCategorySelect(sub.value)}
                        className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                          formData.related_to === sub.value
                            ? 'border-[#FF6B35] bg-orange-50'
                            : 'border-slate-200 hover:border-[#FF6B35] hover:bg-orange-50'
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-700">{sub.label}</span>
                        {formData.related_to === sub.value && <Check className="w-4 h-4 text-[#FF6B35]" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 3: Description */}
                {step === 3 && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-2 text-xs flex items-center gap-2">
                      <span className="text-lg">{selectedQueryType?.icon}</span>
                      <span className="text-slate-600">
                        {selectedQueryType?.label} → {selectedQueryType?.subCategories?.find(s => s.value === formData.related_to)?.label}
                      </span>
                    </div>

                    {/* Quick Action - Smart Routing */}
                    {quickAction && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3">
                        <p className="text-xs text-green-700 mb-2 font-medium">✨ Quick Solution</p>
                        <button
                          onClick={handleQuickAction}
                          className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-green-300 hover:border-green-500 hover:bg-green-50 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-xl">{quickAction.icon}</span>
                            <span className="font-medium text-slate-700">{quickAction.label}</span>
                          </span>
                          <ExternalLink className="w-4 h-4 text-green-600" />
                        </button>
                        <p className="text-xs text-slate-500 mt-2 text-center">Or describe your specific question below</p>
                      </div>
                    )}

                    <Textarea
                      placeholder="Please describe your issue or question..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="min-h-[100px] resize-none text-sm"
                      data-testid="query-message"
                    />

                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-xs">
                        <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-slate-600">Attach</span>
                        <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                      </label>
                      
                      {!isRecording && !audioUrl && (
                        <button
                          onClick={startRecording}
                          className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs"
                        >
                          <Mic className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-slate-600">Voice</span>
                        </button>
                      )}

                      {isRecording && (
                        <button
                          onClick={stopRecording}
                          className="flex items-center gap-1 px-2 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs animate-pulse"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>{formatTime(recordTime)}</span>
                        </button>
                      )}
                    </div>

                    {audioUrl && (
                      <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
                        <button
                          onClick={() => {
                            if (isPlaying) audioRef.current?.pause();
                            else audioRef.current?.play();
                            setIsPlaying(!isPlaying);
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-sm"
                        >
                          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </button>
                        <span className="text-xs text-slate-600 flex-1">Voice ({formatTime(recordTime)})</span>
                        <button onClick={() => { setAudioUrl(null); setAudioBlob(null); setRecordTime(0); }} className="text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                      </div>
                    )}

                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {attachments.map((att, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-xs">
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[60px] truncate">{att.name}</span>
                            <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Contact Details - Always shown, auto-filled for logged-in users */}
                {step === 4 && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      {isLoggedIn ? 'Please confirm your contact details.' : 'Share your contact details so we can get back to you.'}
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
                      <Input
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Phone <span className="text-red-500">*</span></label>
                      <Input
                        placeholder="Phone number"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <Input
                        type="email"
                        placeholder="Email address (optional)"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t bg-slate-50 flex gap-2">
                {step > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-1 h-9"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                )}
                {step === 3 && (
                  <Button
                    size="sm"
                    className="flex-1 bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-9"
                    onClick={handleNext}
                    disabled={!formData.message.trim()}
                  >
                    Next
                  </Button>
                )}
                {step === 4 && (
                  <Button
                    size="sm"
                    className="flex-1 bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-9"
                    onClick={handleNext}
                    disabled={!canSubmit() || loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Submit
                  </Button>
                )}
                {/* Back-to-chat shortcut lets the visitor retreat to the AI
                    bot without closing + reopening the dialog. */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('chat')}
                  className="h-9 text-slate-500 hover:text-[#1E3A5F]"
                  data-testid="need-help-back-to-chat"
                >
                  Back to chat
                </Button>
              </div>
              </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RaiseQueryButton;
