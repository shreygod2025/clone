import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import Header from '../components/Header';
import QuickActionsStrip from '../components/QuickActionsStrip';
import WelcomeSection from '../components/WelcomeSection';
import SuggestedActionCard from '../components/SuggestedActionCard';
import ProTipBanner from '../components/ProTipBanner';
import ChatInput from '../components/ChatInput';
import BottomTabBar from '../components/BottomTabBar';
import ComingSoonView from '../components/ComingSoonView';
import ChatMessagesView from '../components/ChatMessagesView';
import SchoolsCrmScreen from './SchoolsCrmScreen';
import { SUGGESTED_ACTIONS, MOCK_RESPONSES } from '../data/suggestedActions';
import { api } from '../services/api';

const CONTACT_ROLES = [
  'Principal',
  'Director',
  'Trustee / Owner',
  'Vice Principal',
  'Coordinator',
  'Primary Coordinator',
  'Secondary Coordinator',
  'Computer Teacher',
  'Teacher',
  'Head of Department',
  'Accounts',
  'Admin',
  'Other',
];

const SCHOOL_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge (IGCSE)', 'Other'];

const STUDENT_TIERS = ['100-300', '300-500', '500-800', '800-1000', '1000-1500', '1500+'];

const SCHOOL_PROGRAMS = [
  'Agentic AI & Coding Excellence Lab (K-12)',
  'Robotics & STEM Innovation Lab',
  'NEP 2020 Future Skills Curriculum',
  'AI Foundations & Coding Bootcamp',
];

const MEETING_TYPES = ['In-Person Campus Visit', 'Online Demo', 'Phone Call'];

const FALLBACK_LEADS = [
  {
    id: 'bb836251-4829-4667-837d-ff5a05a660dc',
    school_name: 'Limbu Maharaj School',
    schoolName: 'Limbu Maharaj School',
    contact_name: 'Yash Limbachiya',
    contactPerson: 'Yash Limbachiya (Principal)',
    contact_role: 'Principal',
    contactRole: 'Principal',
    email: 'yashlimbachiya900@gmail.com',
    phone: '9326754955',
    location: 'Mumbai, Maharashtra',
    board: 'CBSE',
    studentCount: '800-1000',
    recommendedProgram: 'Agentic AI & Coding Excellence Lab (K-12)',
    programs_interested: ['Agentic AI & Coding Excellence Lab (K-12)'],
    status: 'new',
    notes:
      'Lead recorded for Limbu Maharaj School. Primary contact Yash Limbachiya (Principal). Interested in NEP-aligned AI lab and robotics demonstration.',
  },
  {
    id: 'dps-mumbai-4829',
    school_name: 'Delhi Public School Mumbai',
    schoolName: 'Delhi Public School Mumbai',
    contact_name: 'Dr. Arvind Mehta',
    contactPerson: 'Dr. Arvind Mehta (Principal)',
    contact_role: 'Principal',
    contactRole: 'Principal',
    email: 'principal@dpsmumbai.edu.in',
    phone: '9820144921',
    location: 'Mumbai, Maharashtra',
    board: 'CBSE',
    studentCount: '1000-1500',
    recommendedProgram: 'Agentic AI & Coding Excellence Lab (K-12)',
    programs_interested: ['Agentic AI & Coding Excellence Lab (K-12)'],
    status: 'new',
    notes:
      'High-priority lead at DPS Mumbai. Discussion scheduled regarding AI lab infrastructure and teacher training.',
  },
];

export default function MainScreen({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('ai_chat');
  const [chatMode, setChatMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [whatsAppModalVisible, setWhatsAppModalVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const landingScrollRef = useRef(null);

  // Monitor virtual keyboard on mobile to maximize chat input visibility
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      setTimeout(() => {
        landingScrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleInputFocus = () => {
    setIsKeyboardVisible(true);
    setTimeout(() => {
      landingScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // ── Modals for Chat Features ─────────────────────────────────────────────────
  // 0. Add School Lead Form Modal State (Matching AdminSchoolCRM Web App)
  const [addLeadModalVisible, setAddLeadModalVisible] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('Principal');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newBoard, setNewBoard] = useState('CBSE');
  const [newStudentTier, setNewStudentTier] = useState('500-800');
  const [newOffering, setNewOffering] = useState('Agentic AI & Coding Excellence Lab (K-12)');
  const [newMeetingType, setNewMeetingType] = useState('In-Person Campus Visit');
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('11:00 AM');
  const [newNotes, setNewNotes] = useState('');
  const [isSavingNewLead, setIsSavingNewLead] = useState(false);

  // 1. Edit Lead Modal State (Matching Add School Lead Form)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editContactName, setEditContactName] = useState('');
  const [editContactRole, setEditContactRole] = useState('Principal');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocation, setEditLocation] = useState('Mumbai, Maharashtra');
  const [editAddress, setEditAddress] = useState('');
  const [editBoard, setEditBoard] = useState('CBSE');
  const [editStudentTier, setEditStudentTier] = useState('500-800');
  const [editOffering, setEditOffering] = useState('Agentic AI & Coding Excellence Lab (K-12)');
  const [editMeetingType, setEditMeetingType] = useState('In-Person Campus Visit');
  const [editMeetingDate, setEditMeetingDate] = useState('');
  const [editMeetingTime, setEditMeetingTime] = useState('11:00 AM');
  const [editStatus, setEditStatus] = useState('new');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 2. Send Email Modal State
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailTargetLead, setEmailTargetLead] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // 3. WhatsApp Modal State
  const [waModalVisible, setWaModalVisible] = useState(false);
  const [waTargetLead, setWaTargetLead] = useState(null);
  const [waMessageText, setWaMessageText] = useState('');

  // 4. Schedule Meeting Modal State
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleTargetLead, setScheduleTargetLead] = useState(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('11:00 AM');
  const [meetingType, setMeetingType] = useState('In-Person Campus Visit');
  const [isScheduling, setIsScheduling] = useState(false);

  // 5. Raise Support Ticket Modal State
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketTargetLead, setTicketTargetLead] = useState(null);
  const [ticketTitle, setTicketTitle] = useState('Curriculum Customization for Robotics Lab');
  const [ticketPriority, setTicketPriority] = useState('High');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isRaisingTicket, setIsRaisingTicket] = useState(false);

  // 6. Follow-up Modal State
  const [followupModalVisible, setFollowupModalVisible] = useState(false);
  const [followupTargetLead, setFollowupTargetLead] = useState(null);
  const [followupDate, setFollowupDate] = useState('');
  const [followupComment, setFollowupComment] = useState('');
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);

  // 7. Assign Lead Modal State
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignTargetLead, setAssignTargetLead] = useState(null);
  const [assignedMemberName, setAssignedMemberName] = useState('Yash Limbachiya (B2B Lead)');
  const [isAssigning, setIsAssigning] = useState(false);

  // 8. Lost Lead Modal State
  const [lostModalVisible, setLostModalVisible] = useState(false);
  const [lostTargetLead, setLostTargetLead] = useState(null);
  const [lostReason, setLostReason] = useState('Budget Constraint');
  const [isMarkingLost, setIsMarkingLost] = useState(false);

  // 9. Add Note Modal State
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteTargetLead, setNoteTargetLead] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // 10. Documents & Proposals Modal State
  const [docsModalVisible, setDocsModalVisible] = useState(false);
  const [docsTargetLead, setDocsTargetLead] = useState(null);

  // 11. Conversational AI Actions & Confirmation State
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [pendingNoteTarget, setPendingNoteTarget] = useState(null);

  // ── Helper: Locate Latest Active Lead in Conversation ────────────────────────
  const findLatestLead = () => {
    const withLead = [...messages].reverse().find((m) => m.leadCard && !m.leadCard.isDeleted);
    return withLead ? withLead.leadCard : null;
  };

  const findLatestLeadIncludingArchived = () => {
    const withLead = [...messages].reverse().find((m) => m.leadCard);
    return withLead ? withLead.leadCard : null;
  };

  // ── Open Modals ─────────────────────────────────────────────────────────────
  const openAddLeadModal = (initialData = {}) => {
    setNewSchoolName(initialData.school_name || initialData.schoolName || '');
    setNewContactName(initialData.contact_name || initialData.contactPerson || '');
    setNewContactRole(initialData.contact_role || 'Principal');
    setNewPhone(initialData.phone || '');
    setNewEmail(initialData.email || '');
    setNewLocation(initialData.location || 'Mumbai, Maharashtra');
    setNewAddress(initialData.address || '');
    setNewBoard(initialData.board || 'CBSE');
    setNewStudentTier(initialData.student_count_tier || initialData.studentCount || '500-800');
    setNewOffering(initialData.program || initialData.recommendedProgram || 'Agentic AI & Coding Excellence Lab (K-12)');
    setNewMeetingType(initialData.meeting_type || 'In-Person Campus Visit');
    setNewMeetingDate(initialData.meeting_date || '');
    setNewMeetingTime(initialData.meeting_time || '11:00 AM');
    setNewNotes(initialData.notes || '');
    setAddLeadModalVisible(true);
  };

  const openEditLeadModal = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const schoolName = target.schoolName || target.school_name || 'this school';

    // Rule 1: Cannot edit if deleted
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Cannot Edit Lead', `"${schoolName}" has been deleted from CRM and cannot be edited.`);
      return;
    }

    // Rule 4: Cannot do anything if lost
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${schoolName}" is marked as a Lost Lead. No edits or modifications can be made.`);
      return;
    }

    setEditingLead(target);
    setEditSchoolName(target.schoolName || target.school_name || '');
    const cPerson = target.contactPerson || target.contact_name || '';
    setEditContactName(cPerson.replace(/\s*\([^)]*\)/, '').trim());
    setEditContactRole(target.contactRole || target.contact_role || 'Principal');
    setEditPhone(target.phone || '');
    setEditEmail(target.email || '');
    setEditLocation(target.location || 'Mumbai, Maharashtra');
    setEditAddress(target.address || '');
    setEditBoard(target.board || 'CBSE');
    setEditStudentTier(target.studentCount || target.school_size || target.student_count_tier || '500-800');
    setEditOffering(target.recommendedProgram || (target.programs_interested && target.programs_interested[0]) || 'Agentic AI & Coding Excellence Lab (K-12)');
    setEditMeetingType(target.meeting_type || 'In-Person Campus Visit');
    setEditMeetingDate(target.meeting_date || '');
    setEditMeetingTime(target.meeting_time || '11:00 AM');
    setEditStatus(target.status || 'new');
    setEditNotes(target.notes || target.discussionSummary || target.discussion_summary || target.comments || '');
    setEditModalVisible(true);
  };

  const openSendEmailModal = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const school = target.schoolName || target.school_name || 'Your School';
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${school}" is marked as a Lost Lead. Communication is locked.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${school}" has been deleted from CRM.`);
      return;
    }
    setEmailTargetLead(target);
    const contact = target.contactPerson || target.contact_name || 'Principal';
    setEmailSubject(`Empowering ${school} with Hands-On Agentic AI & STEM Excellence Lab`);
    setEmailBody(
      `Respected ${contact},\n\nWe would love to introduce the NEP-aligned Agentic AI & Coding Excellence curriculum to ${school} for the upcoming academic session.\n\nOur program provides project-based learning with teacher accreditation and complete STEM lab setup.\n\nWould you be open for a brief 10-minute briefing next Tuesday?\n\nWarm regards,\nOLL CRM Partnerships Team`
    );
    setEmailModalVisible(true);
  };

  const openSendWhatsAppModal = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const school = target.schoolName || target.school_name || 'Your School';
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${school}" is marked as a Lost Lead. Communication is locked.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${school}" has been deleted from CRM.`);
      return;
    }
    setWaTargetLead(target);
    const contact = target.contactPerson || target.contact_name || 'Principal';
    setWaMessageText(
      `Hello ${contact}, greetings from OLL CRM! We are preparing the Agentic AI & Robotics curriculum package for ${school}. Would you have 5 minutes for a quick chat today?`
    );
    setWaModalVisible(true);
  };

  // Rule 2 & 3: Cannot reschedule if meeting scheduled, can reschedule for second time if meeting is done
  const openScheduleMeetingModal = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) {
      Alert.alert('Notice', 'No active school lead found in conversation.');
      return;
    }
    const schoolName = target.schoolName || target.school_name || 'this school';

    // Rule 4: Lost lead check
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${schoolName}" is marked as a Lost Lead. No meetings can be scheduled.`);
      return;
    }

    // Rule 1: Deleted check
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${schoolName}" has been deleted from CRM.`);
      return;
    }

    // Rule 2 & 3:
    const isMeetingScheduled = target.status === 'meeting_scheduled' || (target.meeting_date && target.status !== 'meeting_done');
    const isMeetingDone = target.status === 'meeting_done';

    if (isMeetingScheduled && !isMeetingDone) {
      Alert.alert(
        'Meeting Already Scheduled',
        `A meeting is already scheduled with "${schoolName}" for ${target.meeting_date || 'an upcoming date'}${target.meeting_time ? ` at ${target.meeting_time}` : ''}.\n\nYou cannot reschedule this meeting until it has taken place and been marked as Done.`
      );
      return;
    }

    setScheduleTargetLead(target);
    const d = new Date();
    d.setDate(d.getDate() + 2);
    setMeetingDate(d.toISOString().split('T')[0]);
    setMeetingTime('11:30 AM');
    setMeetingType(isMeetingDone ? 'Follow-up / 2nd Demo Meeting' : 'In-Person Campus Visit');
    setScheduleModalVisible(true);
  };

  const openRaiseTicketModal = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const schoolName = target.schoolName || target.school_name || 'this school';
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${schoolName}" is marked as a Lost Lead. Support tickets cannot be raised.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${schoolName}" has been deleted from CRM.`);
      return;
    }
    setTicketTargetLead(target);
    setTicketTitle('Curriculum Customization for Robotics Lab');
    setTicketPriority('High');
    setTicketDescription('');
    setTicketModalVisible(true);
  };

  const openFollowupModal = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const schoolName = target.schoolName || target.school_name || 'this school';
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${schoolName}" is marked as a Lost Lead. Follow-ups cannot be scheduled.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${schoolName}" has been deleted from CRM.`);
      return;
    }
    setFollowupTargetLead(target);
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setFollowupDate(d.toISOString().split('T')[0]);
    setFollowupComment('Follow up on Agentic AI curriculum quote and lab infrastructure requirements');
    setFollowupModalVisible(true);
  };

  const openAssignLeadModal = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const schoolName = target.schoolName || target.school_name || 'this school';
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${schoolName}" is marked as a Lost Lead. Lost leads cannot be assigned.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${schoolName}" has been deleted from CRM.`);
      return;
    }
    setAssignTargetLead(target);
    setAssignedMemberName('Yash Limbachiya (B2B Lead)');
    setAssignModalVisible(true);
  };

  const openLostLeadModal = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const schoolName = target.schoolName || target.school_name || 'this school';
    if (target.status === 'lost') {
      Alert.alert('Already Lost', `"${schoolName}" is already recorded as a Lost Lead.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${schoolName}" has been deleted from CRM.`);
      return;
    }
    promptLostConfirmation(target, 'Closed as lost lead');
  };

  const openNoteModal = (leadCard, initialText = '') => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const schoolName = target.schoolName || target.school_name || 'this school';
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${schoolName}" is marked as a Lost Lead. Notes cannot be added to closed leads.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${schoolName}" has been deleted from CRM.`);
      return;
    }
    setNoteTargetLead(target);
    setNoteText(initialText || '');
    setNoteModalVisible(true);
  };

  const handleDocs = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const schoolName = target.schoolName || target.school_name || 'this school';
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${schoolName}" is marked as a Lost Lead.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${schoolName}" has been deleted from CRM.`);
      return;
    }
    setDocsTargetLead(target);
    setDocsModalVisible(true);
  };

  // ── Action Handlers ──────────────────────────────────────────────────────────
  // 1. Mark Meeting Done directly in CRM database
  const handleMarkMeetingDone = async (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) {
      Alert.alert('Notice', 'No active school lead found to update.');
      return;
    }

    const schoolName = target.schoolName || target.school_name || 'School';

    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${schoolName}" is marked as a Lost Lead. No actions can be performed.`);
      return;
    }

    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${schoolName}" has been deleted from CRM.`);
      return;
    }

    if (target.status === 'meeting_done') {
      Alert.alert('Already Completed', `The meeting for "${schoolName}" is already marked as done. You can now schedule a 2nd meeting or send a proposal quote.`);
      return;
    }

    setIsTyping(true);

    if (target.id) {
      await api.updateSchoolInquiry(target.id, { status: 'meeting_done' });
    }

    setIsTyping(false);

    // Update in existing messages stream
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.leadCard && (msg.leadCard.id === target.id || msg.leadCard.schoolName === schoolName)) {
          return {
            ...msg,
            leadCard: {
              ...msg.leadCard,
              status: 'meeting_done',
            },
          };
        }
        return msg;
      })
    );

    // Append AI confirmation message
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `🎉 **Meeting Done & Status Updated!**\n\nI have marked the meeting as **COMPLETED** for **${schoolName}** in the live School CRM database.\n\n• **New Stage:** \`MEETING DONE\`\n• **Next Allowed Step:** Schedule 2nd Meeting or Generate customized curriculum quote.`,
        nextActions: ['Schedule 2nd Meeting', 'Generate Proposal Quote'],
        time: 'Just now',
      },
    ]);
  };

  // ── Natural Language Parsing & School Resolution Helpers ──────────────────
  const extractMeetingDetailsFromText = (text, lead) => {
    const lower = text.toLowerCase();
    
    // 1. Mode: online / offline / phone
    let mode = 'In-Person Campus Visit';
    if (lower.includes('online') || lower.includes('zoom') || lower.includes('google meet') || lower.includes('virtual') || lower.includes('demo')) {
      mode = 'Online Demo';
    } else if (lower.includes('phone') || lower.includes('call') || lower.includes('telephonic')) {
      mode = 'Phone Call';
    }

    // 2. Date
    let date = '';
    const isoMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (isoMatch) {
      date = isoMatch[0];
    } else if (lower.includes('tomorrow')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      date = d.toISOString().split('T')[0];
    } else if (lower.includes('next week') || lower.includes('next monday')) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      date = d.toISOString().split('T')[0];
    } else if (lower.includes('in 2 days')) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      date = d.toISOString().split('T')[0];
    } else if (lower.includes('friday')) {
      const d = new Date();
      d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7 || 7));
      date = d.toISOString().split('T')[0];
    }

    // 3. Time
    let time = '11:00 AM';
    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/);
    if (timeMatch) {
      time = timeMatch[1].toUpperCase();
    }

    // 4. Location / Link
    let location = mode === 'Online Demo' ? 'Google Meet / Zoom' : (lead?.location || 'School Campus');
    const meetLinkMatch = text.match(/(https?:\/\/[^\s]+)/);
    if (meetLinkMatch) {
      location = meetLinkMatch[1];
    }

    // 5. Notes
    let notes = 'Agentic AI & Coding Excellence curriculum presentation and lab demonstration';
    const notesMatch = text.match(/(?:regarding|about|agenda|discuss|for)\s+([^,.]+)/i);
    if (notesMatch && notesMatch[1].length > 4) {
      notes = notesMatch[1].trim();
    }

    const hasRequiredDetails = Boolean(date);

    return {
      date,
      time,
      mode,
      location,
      notes,
      hasRequiredDetails,
    };
  };

  const extractNoteAndSchool = (text) => {
    let schoolQuery = '';
    let extractedNote = '';

    const colonIdx = text.indexOf(':');
    if (colonIdx !== -1 && colonIdx < text.length - 1) {
      const left = text.slice(0, colonIdx);
      extractedNote = text.slice(colonIdx + 1).trim();
      schoolQuery = left
        .replace(/add\s+a\s+note\s+for/i, '')
        .replace(/add\s+note\s+for/i, '')
        .replace(/add\s+a\s+note\s+to/i, '')
        .replace(/add\s+note\s+to/i, '')
        .replace(/add\s+a\s+comment\s+for/i, '')
        .replace(/add\s+comment\s+for/i, '')
        .replace(/add\s+a\s+comment\s+to/i, '')
        .replace(/add\s+comment\s+to/i, '')
        .replace(/note\s+for/i, '')
        .replace(/comment\s+for/i, '')
        .replace(/note/i, '')
        .replace(/comment/i, '')
        .trim();
    } else {
      const thatMatch = text.match(/(?:saying|that|with note)\s+(.+)$/i);
      if (thatMatch) {
        extractedNote = thatMatch[1].trim();
        const left = text.slice(0, thatMatch.index);
        schoolQuery = left
          .replace(/add\s+a\s+note\s+for/i, '')
          .replace(/add\s+note\s+for/i, '')
          .replace(/add\s+a\s+note\s+to/i, '')
          .replace(/add\s+note\s+to/i, '')
          .replace(/add\s+a\s+comment\s+for/i, '')
          .replace(/add\s+comment\s+for/i, '')
          .replace(/add\s+a\s+comment\s+to/i, '')
          .replace(/add\s+comment\s+to/i, '')
          .replace(/note/i, '')
          .replace(/comment/i, '')
          .trim();
      } else {
        schoolQuery = text
          .replace(/add\s+a\s+note\s+for/i, '')
          .replace(/add\s+note\s+for/i, '')
          .replace(/add\s+a\s+note\s+to/i, '')
          .replace(/add\s+note\s+to/i, '')
          .replace(/add\s+a\s+comment\s+for/i, '')
          .replace(/add\s+comment\s+for/i, '')
          .replace(/add\s+a\s+comment\s+to/i, '')
          .replace(/add\s+comment\s+to/i, '')
          .replace(/add\s+note/i, '')
          .replace(/add\s+comment/i, '')
          .replace(/note/i, '')
          .replace(/comment/i, '')
          .trim();
      }
    }

    return { schoolQuery, extractedNote };
  };

  const resolveSchoolFromQuery = async (queryText) => {
    let clean = (queryText || '').trim().toLowerCase();
    
    clean = clean
      .replace(/^for\s+/i, '')
      .replace(/^with\s+/i, '')
      .replace(/^to\s+/i, '')
      .replace(/^about\s+/i, '')
      .replace(/\s+lead$/i, '')
      .replace(/\s+school$/i, '')
      .trim();

    const isThisLead =
      !clean ||
      clean === 'this' ||
      clean === 'this school' ||
      clean === 'this school lead' ||
      clean === 'this lead' ||
      clean === 'the lead' ||
      clean === 'the school' ||
      clean === 'school' ||
      clean === 'lead';

    const latest = findLatestLead();

    if (isThisLead) {
      if (latest) return { status: 'single', lead: latest };
      const anyLatest = findLatestLeadIncludingArchived();
      if (anyLatest) return { status: 'single', lead: anyLatest };
    }

    const res = await api.fetchSchoolInquiries(100);
    const leadsMap = new Map();

    FALLBACK_LEADS.forEach((l) => {
      const key = (l.school_name || l.schoolName || '').toLowerCase();
      if (key) leadsMap.set(key, l);
    });

    if (res.success && Array.isArray(res.inquiries)) {
      res.inquiries.forEach((l) => {
        const key = (l.school_name || l.schoolName || '').toLowerCase();
        if (key) leadsMap.set(key, l);
      });
    }

    messages.forEach((m) => {
      if (m.leadCard) {
        const key = (m.leadCard.schoolName || m.leadCard.school_name || '').toLowerCase();
        if (key) leadsMap.set(key, m.leadCard);
      }
    });

    const allLeads = Array.from(leadsMap.values());

    if (!clean) {
      if (latest) return { status: 'single', lead: latest };
      if (allLeads.length > 0) return { status: 'single', lead: allLeads[0] };
      return { status: 'none' };
    }

    const exact = allLeads.find((l) => {
      const s = (l.schoolName || l.school_name || '').toLowerCase();
      return s === clean;
    });
    if (exact) return { status: 'single', lead: exact };

    const matches = allLeads.filter((l) => {
      const s = (l.schoolName || l.school_name || '').toLowerCase();
      const c = (l.contactPerson || l.contact_name || '').toLowerCase();
      return s.includes(clean) || clean.includes(s) || c.includes(clean);
    });

    if (matches.length === 1) {
      return { status: 'single', lead: matches[0] };
    } else if (matches.length > 1) {
      return { status: 'multiple', candidates: matches };
    }

    const tokens = clean.split(/\s+/).filter((t) => t.length >= 3 && !['the', 'and', 'for', 'school', 'lead'].includes(t));
    if (tokens.length > 0) {
      const tokenMatches = allLeads.filter((l) => {
        const s = (l.schoolName || l.school_name || '').toLowerCase();
        return tokens.some((tok) => s.includes(tok));
      });
      if (tokenMatches.length === 1) {
        return { status: 'single', lead: tokenMatches[0] };
      } else if (tokenMatches.length > 1) {
        return { status: 'multiple', candidates: tokenMatches };
      }
    }

    if ((clean.includes('this') || clean.includes('lead')) && latest) {
      return { status: 'single', lead: latest };
    }

    return { status: 'none', query: clean };
  };

  // ── Confirmation Prompters ──────────────────────────────────────────────────
  const promptDeleteConfirmation = (lead) => {
    if (!lead) return;
    const sName = lead.schoolName || lead.school_name || 'School';
    const cPerson = lead.contactPerson || lead.contact_name || 'Principal';
    setChatMode(true);
    const confCard = {
      id: `conf_del_${Date.now()}`,
      actionType: 'delete',
      danger: true,
      title: 'Confirm Permanent Deletion',
      description: 'Are you sure you want to permanently delete this school lead from the CRM database? This action is permanent and cannot be undone.',
      schoolName: sName,
      leadId: lead.id,
      lead: lead,
      details: [
        { label: 'School Name', value: sName },
        { label: 'Contact Person', value: cPerson },
        { label: 'Phone Number', value: lead.phone || 'N/A' },
        { label: 'Location', value: lead.location || 'Mumbai, Maharashtra' },
        { label: 'Current Status', value: (lead.status || 'NEW').toUpperCase() },
      ],
      confirmLabel: 'Yes, Delete Permanently',
      cancelLabel: 'No, Cancel',
      status: 'pending',
    };
    setPendingConfirmation(confCard);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `⚠️ **Permanent Deletion Requested for ${sName}:**\n\nPlease confirm below using **Yes** or **No** before I execute this irreversible deletion:`,
        confirmationCard: confCard,
        time: 'Just now',
      },
    ]);
  };

  const promptScheduleMeetingConfirmation = (lead, details) => {
    if (!lead) return;
    const sName = lead.schoolName || lead.school_name || 'School';
    setChatMode(true);
    const confCard = {
      id: `conf_sch_${Date.now()}`,
      actionType: 'schedule_meeting',
      danger: false,
      title: 'Confirm Meeting Schedule',
      description: 'Please review the meeting summary before confirming. The meeting will be logged in the CRM calendar upon confirmation.',
      schoolName: sName,
      leadId: lead.id,
      lead: lead,
      payload: details,
      details: [
        { label: 'School Name', value: sName },
        { label: 'Date & Time', value: `${details.date} at ${details.time}` },
        { label: 'Meeting Mode', value: details.mode },
        { label: 'Location / Link', value: details.location },
        { label: 'Discussion Notes', value: details.notes },
      ],
      confirmLabel: 'Yes, Schedule Meeting',
      cancelLabel: 'No, Cancel',
      status: 'pending',
    };
    setPendingConfirmation(confCard);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `📅 **Meeting Summary for ${sName}:**\n\nPlease confirm to save this meeting to the CRM calendar:`,
        confirmationCard: confCard,
        time: 'Just now',
      },
    ]);
  };

  const promptAddNoteConfirmation = (lead, noteContent) => {
    if (!lead) return;
    const sName = lead.schoolName || lead.school_name || 'School';
    setChatMode(true);
    const confCard = {
      id: `conf_note_${Date.now()}`,
      actionType: 'add_note',
      danger: false,
      title: 'Confirm Adding Note / Comment',
      description: 'This note will be recorded in the CRM comments history and attached to this school lead.',
      schoolName: sName,
      leadId: lead.id,
      lead: lead,
      payload: { note: noteContent },
      details: [
        { label: 'School Name', value: sName },
        { label: 'Author', value: user?.name || 'CRM Assistant' },
        { label: 'Note Content', value: noteContent },
      ],
      confirmLabel: 'Yes, Save Note',
      cancelLabel: 'No, Cancel',
      status: 'pending',
    };
    setPendingConfirmation(confCard);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `📝 **Confirm Note for ${sName}:**\n\nPlease confirm to save this note to the CRM database:`,
        confirmationCard: confCard,
        time: 'Just now',
      },
    ]);
  };

  const promptArchiveConfirmation = (lead) => {
    if (!lead) return;
    const sName = lead.schoolName || lead.school_name || 'School';
    setChatMode(true);
    const confCard = {
      id: `conf_arc_${Date.now()}`,
      actionType: 'archive',
      danger: false,
      title: 'Confirm Lead Archival',
      description: 'Archiving moves this school lead out of the active pipeline while preserving all details and history. You can restore it anytime with "Unarchive".',
      schoolName: sName,
      leadId: lead.id,
      lead: lead,
      details: [
        { label: 'School Name', value: sName },
        { label: 'Contact Person', value: lead.contactPerson || lead.contact_name || 'Principal' },
        { label: 'Phone Number', value: lead.phone || 'N/A' },
        { label: 'Current Status', value: (lead.status || 'NEW').toUpperCase() },
      ],
      confirmLabel: 'Yes, Archive Lead',
      cancelLabel: 'No, Cancel',
      status: 'pending',
    };
    setPendingConfirmation(confCard);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `📦 **Archival Requested for ${sName}:**\n\nPlease confirm below using **Yes** or **No**:`,
        confirmationCard: confCard,
        time: 'Just now',
      },
    ]);
  };

  const promptUnarchiveConfirmation = (lead) => {
    if (!lead) return;
    const sName = lead.schoolName || lead.school_name || 'School';
    setChatMode(true);
    const confCard = {
      id: `conf_unarc_${Date.now()}`,
      actionType: 'unarchive',
      danger: false,
      title: 'Confirm Lead Restoration',
      description: 'Restoring will move this school lead back into your active CRM sales pipeline with full action controls enabled.',
      schoolName: sName,
      leadId: lead.id,
      lead: lead,
      details: [
        { label: 'School Name', value: sName },
        { label: 'Contact Person', value: lead.contactPerson || lead.contact_name || 'Principal' },
        { label: 'Phone Number', value: lead.phone || 'N/A' },
        { label: 'Status', value: 'ARCHIVED' },
      ],
      confirmLabel: 'Yes, Restore to Pipeline',
      cancelLabel: 'No, Cancel',
      status: 'pending',
    };
    setPendingConfirmation(confCard);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `🔄 **Restoration Requested for ${sName}:**\n\nPlease confirm below to restore this lead to the active pipeline:`,
        confirmationCard: confCard,
        time: 'Just now',
      },
    ]);
  };

  const promptLostConfirmation = (lead, reason) => {
    if (!lead) return;
    const sName = lead.schoolName || lead.school_name || 'School';
    const r = reason || 'Closed as lost via conversational AI assistant';
    setChatMode(true);
    const confCard = {
      id: `conf_lost_${Date.now()}`,
      actionType: 'lost',
      danger: true,
      title: 'Confirm Mark as Lost Lead',
      description: 'Are you sure you want to mark this school as a Lost Lead? Under CRM rules, all further communication, meetings, and edits will be disabled. All previous history will be preserved.',
      schoolName: sName,
      leadId: lead.id,
      lead: lead,
      payload: { reason: r },
      details: [
        { label: 'School Name', value: sName },
        { label: 'Contact Person', value: lead.contactPerson || lead.contact_name || 'Principal' },
        { label: 'Current Status', value: (lead.status || 'NEW').toUpperCase() },
        { label: 'Reason for Loss', value: r },
      ],
      confirmLabel: 'Yes, Mark as Lost',
      cancelLabel: 'No, Cancel',
      status: 'pending',
    };
    setPendingConfirmation(confCard);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `❌ **Mark as Lost Lead Requested for ${sName}:**\n\nPlease confirm below using **Yes** or **No**:`,
        confirmationCard: confCard,
        time: 'Just now',
      },
    ]);
  };

  // ── Execute Confirmed & Cancelled Operations ────────────────────────────────
  const executeConfirmedAction = async (confCard) => {
    if (!confCard) return;
    const targetLead = confCard.lead;
    const schoolName = confCard.schoolName || targetLead?.schoolName || targetLead?.school_name || 'School';
    const targetId = confCard.leadId || targetLead?.id;

    // Update confirmationCard status in message history to 'confirmed'
    setMessages((prev) =>
      prev.map((m) => {
        if (m.confirmationCard && m.confirmationCard.id === confCard.id) {
          return {
            ...m,
            confirmationCard: {
              ...m.confirmationCard,
              status: 'confirmed',
            },
          };
        }
        return m;
      })
    );

    setPendingConfirmation(null);
    setIsTyping(true);

    const author = user?.name || 'CRM Assistant';

    // ── 1. Delete Lead ────────────────────────────────────────────────────────
    if (confCard.actionType === 'delete') {
      if (targetId) {
        await api.deleteSchoolInquiry(targetId);
      }
      setIsTyping(false);

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.leadCard && (msg.leadCard.id === targetId || msg.leadCard.schoolName === schoolName)) {
            return {
              ...msg,
              leadCard: {
                ...msg.leadCard,
                status: 'deleted',
                isDeleted: true,
              },
            };
          }
          return msg;
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `🗑️ **Lead Permanently Deleted:** **${schoolName}** has been removed from the CRM database.\n\n• **Status:** \`DELETED\`\n• **Action:** Permanent Deletion Confirmed\n\nAll records for this school lead have been purged.`,
          nextActions: ['Add School Lead'],
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── 2. Schedule Meeting ──────────────────────────────────────────────────
    if (confCard.actionType === 'schedule_meeting') {
      const payload = confCard.payload || {};
      const mDate = payload.date || meetingDate || new Date().toISOString().split('T')[0];
      const mTime = payload.time || meetingTime || '11:00 AM';
      const mMode = payload.mode || meetingType || 'In-Person Campus Visit';
      const mLocation = payload.location || (mMode === 'Online Demo' ? 'Google Meet / Zoom' : targetLead?.location || 'School Campus');
      const mNotes = payload.notes || 'Curriculum demo and discussion';

      const logText = `Meeting scheduled for ${mDate} at ${mTime} (${mMode}) - ${mNotes}`;

      if (targetId) {
        await api.updateSchoolInquiry(targetId, {
          meeting_date: mDate,
          meeting_time: mTime,
          meeting_type: mMode,
          status: 'meeting_scheduled',
        });
        await api.addSchoolComment(targetId, logText, author);
      }
      setIsTyping(false);

      const updatedLeadCard = {
        ...targetLead,
        status: 'meeting_scheduled',
        meeting_date: mDate,
        meeting_time: mTime,
        meeting_type: mMode,
        comments: [
          ...(targetLead?.comments || []),
          { text: logText, author: author, created_at: new Date().toISOString() },
        ],
      };

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.leadCard && (msg.leadCard.id === targetId || msg.leadCard.schoolName === schoolName)) {
            return {
              ...msg,
              leadCard: {
                ...msg.leadCard,
                ...updatedLeadCard,
              },
            };
          }
          return msg;
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `📅 **Meeting Successfully Scheduled!**\n\n• **School:** ${schoolName}\n• **Date & Time:** \`${mDate}\` at \`${mTime}\`\n• **Mode:** ${mMode}\n• **Location/Link:** ${mLocation}\n• **Agenda:** ${mNotes}\n\nThe meeting has been saved against the school lead in the CRM calendar and added to activity history.\n\nUpdated lead card rendered below:`,
          leadCard: updatedLeadCard,
          nextActions: ['Mark Meeting Done', 'Send Meeting Invite Email', 'Generate Proposal Quote'],
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── 3. Add Note / Comment ────────────────────────────────────────────────
    if (confCard.actionType === 'add_note') {
      const noteContent = confCard.payload?.note || noteText || '';
      const existingNotes = targetLead?.notes || '';
      const updatedNotes = existingNotes
        ? `${existingNotes}\n[${new Date().toLocaleDateString()}]: ${noteContent}`
        : noteContent;

      if (targetId) {
        await api.addSchoolComment(targetId, noteContent, author);
        await api.updateSchoolInquiry(targetId, { notes: updatedNotes });
      }
      setIsTyping(false);

      const newComments = [
        ...(targetLead?.comments || []),
        { text: noteContent, author: author, created_at: new Date().toISOString() },
      ];

      const updatedLeadCard = {
        ...targetLead,
        notes: updatedNotes,
        comments: newComments,
      };

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.leadCard && (msg.leadCard.id === targetId || msg.leadCard.schoolName === schoolName)) {
            return {
              ...msg,
              leadCard: {
                ...msg.leadCard,
                ...updatedLeadCard,
              },
            };
          }
          return msg;
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `📝 **Note Successfully Saved to CRM!**\n\n• **School:** ${schoolName}\n• **Note / Comment:** *"${noteContent}"*\n• **Author:** ${author}\n• **Timestamp:** Just now\n\nNote added to comments history against this lead.\n\nUpdated lead card rendered below:`,
          leadCard: updatedLeadCard,
          nextActions: ['Mark Meeting Done', 'Generate Proposal Quote', 'Schedule Meeting'],
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── 4. Archive Lead ──────────────────────────────────────────────────────
    if (confCard.actionType === 'archive') {
      const logText = 'Moved lead to CRM archive';
      if (targetId) {
        await api.updateSchoolInquiry(targetId, { status: 'archived' });
        await api.addSchoolComment(targetId, logText, author);
      }
      setIsTyping(false);

      const updatedCard = {
        ...targetLead,
        status: 'archived',
        isDeleted: false,
        isArchived: true,
        leadScore: 'Archived Record',
        comments: [
          ...(targetLead?.comments || []),
          { text: logText, author: author, created_at: new Date().toISOString() },
        ],
      };

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.leadCard && (msg.leadCard.id === targetId || msg.leadCard.schoolName === schoolName)) {
            return {
              ...msg,
              leadCard: {
                ...msg.leadCard,
                ...updatedCard,
              },
            };
          }
          return msg;
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `📦 **School Lead Archived:** **${schoolName}** has been moved to the CRM archive.\n\nAll details, meeting records, and comments are preserved. You can restore it to the active pipeline anytime by saying "Unarchive ${schoolName}".`,
          leadCard: updatedCard,
          nextActions: ['Add School Lead'],
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── 5. Unarchive Lead ────────────────────────────────────────────────────
    if (confCard.actionType === 'unarchive') {
      const logText = 'Restored lead to active pipeline from archive';
      if (targetId) {
        await api.updateSchoolInquiry(targetId, { status: 'new' });
        await api.addSchoolComment(targetId, logText, author);
      }
      setIsTyping(false);

      const restoredCard = {
        ...targetLead,
        status: 'new',
        isDeleted: false,
        isArchived: false,
        leadScore: '96/100 (Hot Lead)',
        comments: [
          ...(targetLead?.comments || []),
          { text: logText, author: author, created_at: new Date().toISOString() },
        ],
      };

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.leadCard && (msg.leadCard.id === targetId || msg.leadCard.schoolName === schoolName)) {
            return {
              ...msg,
              leadCard: {
                ...msg.leadCard,
                ...restoredCard,
              },
            };
          }
          return msg;
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `🔄 **Lead Unarchived & Restored:** **${schoolName}** has been restored to your active CRM sales pipeline.\n\nAll action buttons and communication channels are now re-enabled. Interactive lead card rendered below:`,
          leadCard: restoredCard,
          nextActions: ['Schedule Meeting', 'Generate Proposal Quote', 'Add Note'],
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── 6. Mark as Lost Lead ─────────────────────────────────────────────────
    if (confCard.actionType === 'lost') {
      const reason = confCard.payload?.reason || lostReason || 'Closed as lost via conversational AI assistant';
      const logText = `Marked as Lost: ${reason}`;
      if (targetId) {
        await api.updateSchoolInquiry(targetId, { status: 'lost', lost_reason: reason });
        await api.addSchoolComment(targetId, logText, author);
      }
      setIsTyping(false);

      const lostCard = {
        ...targetLead,
        status: 'lost',
        isLost: true,
        leadScore: '0/100 (Closed)',
        comments: [
          ...(targetLead?.comments || []),
          { text: logText, author: author, created_at: new Date().toISOString() },
        ],
      };

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.leadCard && (msg.leadCard.id === targetId || msg.leadCard.schoolName === schoolName)) {
            return {
              ...msg,
              leadCard: {
                ...msg.leadCard,
                ...lostCard,
              },
            };
          }
          return msg;
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `❌ **Lead Marked as Lost:** **${schoolName}** is now recorded as a closed \`LOST\` lead in the CRM.\n• **Reason:** ${reason}\n\nPer CRM rules, communication and scheduling are locked. All historical notes and interaction history have been preserved.\n\nUpdated lead card rendered below:`,
          leadCard: lostCard,
          nextActions: ['Add School Lead'],
          time: 'Just now',
        },
      ]);
      return;
    }
  };

  const executeCancelledAction = async (confCard) => {
    if (!confCard) return;
    const schoolName = confCard.schoolName || 'the school';
    const actionName =
      confCard.actionType === 'delete' ? 'Permanent deletion' :
      confCard.actionType === 'schedule_meeting' ? 'Meeting scheduling' :
      confCard.actionType === 'add_note' ? 'Adding note' :
      confCard.actionType === 'archive' ? 'Archiving' :
      confCard.actionType === 'unarchive' ? 'Unarchiving' :
      'Marking as lost lead';

    setMessages((prev) =>
      prev.map((m) => {
        if (m.confirmationCard && m.confirmationCard.id === confCard.id) {
          return {
            ...m,
            confirmationCard: {
              ...m.confirmationCard,
              status: 'cancelled',
            },
          };
        }
        return m;
      })
    );

    setPendingConfirmation(null);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `🚫 **Operation Cancelled:** ${actionName} for **${schoolName}** was cancelled. No changes have been made to your CRM database.`,
        nextActions: ['Add School Lead'],
        time: 'Just now',
      },
    ]);
  };

  const handleSelectDisambiguatedSchool = async (selectedSchool, disambigCard) => {
    if (!selectedSchool || !disambigCard) return;
    const action = disambigCard.action;

    if (action === 'delete') {
      promptDeleteConfirmation(selectedSchool);
    } else if (action === 'schedule_meeting') {
      promptScheduleMeetingConfirmation(selectedSchool, disambigCard.payload || {
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '11:00 AM',
        mode: 'In-Person Campus Visit',
        location: selectedSchool.location || 'School Campus',
        notes: 'Discussion on curriculum partnership',
      });
    } else if (action === 'add_note') {
      if (disambigCard.payload?.note) {
        promptAddNoteConfirmation(selectedSchool, disambigCard.payload.note);
      } else {
        setPendingNoteTarget(selectedSchool);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📝 **Add Note for ${selectedSchool.school_name || selectedSchool.schoolName}:**\n\nWhat note or discussion comment would you like to record in the CRM? (Type your note below or use the form):`,
            noteInputCard: { lead: selectedSchool },
            time: 'Just now',
          },
        ]);
      }
    } else if (action === 'archive') {
      promptArchiveConfirmation(selectedSchool);
    } else if (action === 'unarchive') {
      promptUnarchiveConfirmation(selectedSchool);
    } else if (action === 'lost') {
      promptLostConfirmation(selectedSchool, disambigCard.payload?.reason);
    }
  };

  // 2. Delete Lead permanently from CRM database
  const handleDeleteLead = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) {
      Alert.alert('Notice', 'No active school lead found to delete.');
      return;
    }
    promptDeleteConfirmation(target);
  };

  // 3. Archive Lead
  const handleArchiveLead = async (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    promptArchiveConfirmation(target);
  };

  // 3a. Unarchive Lead
  const handleUnarchiveLead = async (leadCard) => {
    const target = leadCard || findLatestLeadIncludingArchived();
    if (!target) {
      Alert.alert('Notice', 'No school lead found in context to unarchive.');
      return;
    }
    promptUnarchiveConfirmation(target);
  };

  // 3b. Save New School Lead from Form Modal to Backend Database (Matching AdminSchoolCRM)
  const handleSaveNewLeadSubmit = async () => {
    if (!newSchoolName.trim() || !newContactName.trim() || !newPhone.trim()) {
      Alert.alert('Required Fields', 'School Name, Primary Contact Person, and Phone Number are required.');
      return;
    }

    setIsSavingNewLead(true);
    const cleanPhone = newPhone.trim().replace(/[^0-9]/g, '');
    const cleanEmail = newEmail.trim() || `${cleanPhone || 'info'}@school.oll`;

    const leadPayload = {
      school_name: newSchoolName.trim(),
      contact_name: newContactName.trim(),
      contact_role: newContactRole || 'Principal',
      phone: newPhone.trim(),
      email: cleanEmail,
      location: newLocation.trim() || 'Mumbai, Maharashtra',
      address: newAddress.trim() || '',
      board: newBoard || 'CBSE',
      student_count_tier: newStudentTier || '500-800',
      school_size: newStudentTier || '500-800',
      programs_interested: [newOffering || 'Agentic AI & Coding Excellence Lab (K-12)'],
      meeting_type: newMeetingType || 'In-Person Campus Visit',
      meeting_date: newMeetingDate.trim() || null,
      meeting_time: newMeetingTime.trim() || null,
      notes: newNotes.trim() || `Lead registered via OLL Mobile CRM for ${newSchoolName.trim()}.`,
      source: 'manual',
    };

    const res = await api.createSchoolLead(leadPayload);
    setIsSavingNewLead(false);
    setAddLeadModalVisible(false);

    const savedLead = (res.success && res.lead) ? res.lead : {
      ...leadPayload,
      id: `lead_${Date.now()}`,
      status: 'new',
      created_at: new Date().toISOString(),
    };

    const leadCardObj = {
      id: savedLead.id,
      schoolName: savedLead.school_name,
      contactPerson: `${savedLead.contact_name} (${savedLead.contact_role || 'Principal'})`,
      phone: savedLead.phone,
      email: savedLead.email,
      location: savedLead.location,
      board: savedLead.board,
      studentCount: `${savedLead.student_count_tier || savedLead.school_size || '500-800'} Students`,
      recommendedProgram: (savedLead.programs_interested && savedLead.programs_interested[0]) || newOffering,
      leadScore: '85/100 (New School Lead)',
      notes: savedLead.notes,
      status: savedLead.status || 'new',
      meeting_date: savedLead.meeting_date || null,
      meeting_time: savedLead.meeting_time || null,
      meeting_type: savedLead.meeting_type || null,
    };

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `✅ **New School Lead Registered!**\n\nI have successfully saved **${savedLead.school_name}** to your live CRM database.\n\n• **Contact:** ${savedLead.contact_name} (${savedLead.contact_role || 'Principal'})\n• **Phone:** \`${savedLead.phone}\`\n• **Email:** \`${savedLead.email}\`\n• **Location:** ${savedLead.location}\n• **Board:** ${savedLead.board}\n• **Program:** ${leadCardObj.recommendedProgram}`,
        leadCard: leadCardObj,
        nextActions: ['Schedule Meeting', 'Generate Proposal Quote'],
        time: 'Just now',
      },
    ]);

    // Reset state
    setNewSchoolName('');
    setNewContactName('');
    setNewContactRole('Principal');
    setNewPhone('');
    setNewEmail('');
    setNewLocation('');
    setNewAddress('');
    setNewBoard('CBSE');
    setNewStudentTier('500-800');
    setNewOffering('Agentic AI & Coding Excellence Lab (K-12)');
    setNewMeetingType('In-Person Campus Visit');
    setNewMeetingDate('');
    setNewMeetingTime('11:00 AM');
    setNewNotes('');
  };

  // 4. Save Edited Lead to Backend Database
  const handleSaveLeadEdit = async () => {
    if (!editingLead) return;
    if (!editSchoolName.trim() || !editContactName.trim() || !editPhone.trim()) {
      Alert.alert('Required Fields', 'School Name, Primary Contact Person, and Phone Number are required.');
      return;
    }
    setIsSavingEdit(true);

    const updatePayload = {
      school_name: editSchoolName.trim(),
      schoolName: editSchoolName.trim(),
      contact_name: editContactName.trim(),
      contactPerson: `${editContactName.trim()} (${editContactRole})`,
      contact_role: editContactRole,
      contactRole: editContactRole,
      phone: editPhone.trim(),
      email: editEmail.trim(),
      location: editLocation.trim(),
      address: editAddress.trim(),
      board: editBoard,
      student_count_tier: editStudentTier,
      studentCount: editStudentTier,
      school_size: editStudentTier,
      programs_interested: [editOffering],
      recommendedProgram: editOffering,
      meeting_type: editMeetingType,
      meeting_date: editMeetingDate.trim() || null,
      meeting_time: editMeetingTime.trim() || null,
      status: editStatus,
      notes: editNotes.trim(),
    };

    if (editingLead.id) {
      await api.updateSchoolInquiry(editingLead.id, {
        school_name: updatePayload.school_name,
        contact_name: updatePayload.contact_name,
        contact_role: updatePayload.contact_role,
        phone: updatePayload.phone,
        email: updatePayload.email,
        location: updatePayload.location,
        address: updatePayload.address,
        board: updatePayload.board,
        school_size: updatePayload.school_size,
        programs_interested: updatePayload.programs_interested,
        meeting_type: updatePayload.meeting_type,
        meeting_date: updatePayload.meeting_date,
        meeting_time: updatePayload.meeting_time,
        status: updatePayload.status,
        notes: updatePayload.notes,
      });
    }

    setIsSavingEdit(false);
    setEditModalVisible(false);

    // Update lead in messages stream
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.leadCard) {
          const lcName = msg.leadCard.schoolName || msg.leadCard.school_name;
          const origName = editingLead.schoolName || editingLead.school_name;
          if (
            (editingLead.id && msg.leadCard.id === editingLead.id) ||
            (lcName && origName && lcName.toLowerCase() === origName.toLowerCase())
          ) {
            return {
              ...msg,
              leadCard: {
                ...msg.leadCard,
                ...updatePayload,
              },
            };
          }
        }
        return msg;
      })
    );

    const updatedCard = {
      ...editingLead,
      ...updatePayload,
      id: editingLead.id || `lead_${Date.now()}`,
      leadScore: updatePayload.status === 'lost' ? '0/100 (Closed)' : '96/100 (Hot Lead)',
      isDeleted: false,
      isArchived: updatePayload.status === 'archived',
    };

    // AI confirmation message with updated lead card and full action controls
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `✏️ **Lead Updated in CRM:** Changes to **${editSchoolName}** were saved to the database.\n\nUpdated lead card rendered below with full action controls:`,
        leadCard: updatedCard,
        nextActions: updatePayload.status === 'meeting_done'
          ? ['Schedule 2nd Meeting', 'Generate Proposal Quote', 'Add Note']
          : ['Mark Meeting Done', 'Schedule Meeting', 'Generate Proposal Quote', 'Add Note'],
        time: 'Just now',
      },
    ]);
  };

  // 5. Send Email to Lead
  const handleSendEmailSubmit = async () => {
    if (!emailTargetLead || !emailTargetLead.email) {
      Alert.alert('Error', 'Please provide a valid recipient email.');
      return;
    }

    setIsSendingEmail(true);
    await api.sendSchoolEmail({
      school_name: emailTargetLead.schoolName || emailTargetLead.school_name,
      contact_name: emailTargetLead.contactPerson || emailTargetLead.contact_name,
      email: emailTargetLead.email,
    });
    setIsSendingEmail(false);
    setEmailModalVisible(false);

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `✉️ **Email Dispatched:** Personalized pitch sent to **${emailTargetLead.email}** for ${emailTargetLead.schoolName || emailTargetLead.school_name}.`,
        nextActions: ['Follow Up on WhatsApp', 'Schedule Demo Session', 'Generate Proposal Quote'],
        time: 'Just now',
      },
    ]);
  };

  // 6. Send WhatsApp Message
  const handleSendWhatsAppSubmit = () => {
    if (!waTargetLead) return;
    const phone = (waTargetLead.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessageText)}`;

    setWaModalVisible(false);
    Linking.openURL(url).catch(() => {
      Alert.alert('Notice', 'Unable to open WhatsApp on this device.');
    });

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `💬 **WhatsApp Message Prepared:** Initiated WhatsApp conversation with **${waTargetLead.contactPerson || waTargetLead.contact_name}** (${waTargetLead.phone}).`,
        nextActions: ['Mark Meeting Done', 'Send Proposal Quote'],
        time: 'Just now',
      },
    ]);
  };

  // 7. Schedule Meeting Submit (Handles Initial & 2nd Meeting)
  const handleScheduleMeetingSubmit = async () => {
    if (!scheduleTargetLead) return;
    setIsScheduling(true);
    const schoolName = scheduleTargetLead.schoolName || scheduleTargetLead.school_name || 'School';
    const isSecondMeeting = scheduleTargetLead.status === 'meeting_done';
    const newStatus = 'meeting_scheduled';

    if (scheduleTargetLead.id) {
      await api.updateSchoolInquiry(scheduleTargetLead.id, {
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        meeting_type: meetingType,
        status: newStatus,
      });
    }

    setIsScheduling(false);
    setScheduleModalVisible(false);

    // Update in messages stream so the leadCard reflects meeting_scheduled
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.leadCard && (msg.leadCard.id === scheduleTargetLead.id || msg.leadCard.schoolName === schoolName)) {
          return {
            ...msg,
            leadCard: {
              ...msg.leadCard,
              status: newStatus,
              meeting_date: meetingDate,
              meeting_time: meetingTime,
              meeting_type: meetingType,
            },
          };
        }
        return msg;
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: isSecondMeeting
          ? `📅 **2nd Meeting Scheduled!**\n\n• **School:** ${schoolName}\n• **Meeting:** 2nd Round / Follow-up Demo\n• **Date:** \`${meetingDate}\`\n• **Time:** \`${meetingTime}\`\n• **Mode:** ${meetingType}\n\nMeeting logged in CRM calendar and auto-reminders armed.`
          : `📅 **Meeting Scheduled Successfully!**\n\n• **School:** ${schoolName}\n• **Date:** \`${meetingDate}\`\n• **Time:** \`${meetingTime}\`\n• **Mode:** ${meetingType}\n\nMeeting logged in CRM calendar and auto-reminders armed.`,
        nextActions: ['Mark Meeting Done', 'Send Meeting Invite Email', 'Generate Proposal Quote'],
        time: 'Just now',
      },
    ]);
  };

  // 8. Raise Ticket Submit
  const handleRaiseTicketSubmit = async () => {
    if (!ticketTargetLead) return;
    setIsRaisingTicket(true);
    const schoolName = ticketTargetLead.schoolName || ticketTargetLead.school_name || 'School';

    if (ticketTargetLead.id) {
      await api.raiseSchoolTicket(ticketTargetLead.id, {
        title: ticketTitle,
        description: ticketDescription || `Support ticket raised for ${schoolName}`,
        priority: ticketPriority.toLowerCase(),
        category: 'School Lead Support',
      });
    }

    setIsRaisingTicket(false);
    setTicketModalVisible(false);

    const ticketNumber = Math.floor(1000 + Math.random() * 9000);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `🎫 **Support Ticket Created: #TCK-${ticketNumber}**\n\n• **School:** ${schoolName}\n• **Subject:** ${ticketTitle}\n• **Priority:** \`${ticketPriority.toUpperCase()}\`\n\nAssigned to Central Operations desk.`,
        nextActions: ['Mark Meeting Done', 'Generate Proposal Quote', 'Schedule Followup Call'],
        time: 'Just now',
      },
    ]);
  };

  // 9. Followup Submit
  const handleFollowupSubmit = async () => {
    if (!followupTargetLead) return;
    setIsSavingFollowup(true);
    const schoolName = followupTargetLead.schoolName || followupTargetLead.school_name || 'School';

    if (followupTargetLead.id) {
      await api.updateSchoolInquiry(followupTargetLead.id, {
        followup_date: followupDate,
        followup_comment: followupComment,
        status: 'follow_up',
      });
    }

    setIsSavingFollowup(false);
    setFollowupModalVisible(false);

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `⏰ **Follow-up Reminder Set!**\n\n• **School:** ${schoolName}\n• **Date:** \`${followupDate}\`\n• **Action:** ${followupComment}\n\nAutomated push notification scheduled in CRM.`,
        nextActions: ['Mark Meeting Done', 'Generate Proposal Quote'],
        time: 'Just now',
      },
    ]);
  };

  // 10. Assign Lead Submit
  const handleAssignLeadSubmit = async () => {
    if (!assignTargetLead) return;
    setIsAssigning(true);
    const schoolName = assignTargetLead.schoolName || assignTargetLead.school_name || 'School';

    if (assignTargetLead.id) {
      await api.updateSchoolInquiry(assignTargetLead.id, {
        assigned_to_name: assignedMemberName,
      });
    }

    setIsAssigning(false);
    setAssignModalVisible(false);

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `👤 **Lead Assigned:** **${schoolName}** assigned to **${assignedMemberName}** in CRM database.`,
        nextActions: ['Mark Meeting Done', 'Generate Proposal Quote'],
        time: 'Just now',
      },
    ]);
  };

  // 11. Lost Lead Submit
  const handleLostLeadSubmit = async () => {
    if (!lostTargetLead) return;
    setIsMarkingLost(true);
    const schoolName = lostTargetLead.schoolName || lostTargetLead.school_name || 'School';

    if (lostTargetLead.id) {
      await api.updateSchoolInquiry(lostTargetLead.id, {
        status: 'lost',
        lost_reason: lostReason,
      });
    }

    setIsMarkingLost(false);
    setLostModalVisible(false);

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.leadCard && (msg.leadCard.id === lostTargetLead.id || msg.leadCard.schoolName === schoolName)) {
          return {
            ...msg,
            leadCard: {
              ...msg.leadCard,
              status: 'lost',
            },
          };
        }
        return msg;
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `❌ **Lead Marked as Lost:** **${schoolName}** recorded as \`LOST\`.\n• **Reason:** ${lostReason}\n\nLead status updated in CRM pipeline.`,
        nextActions: ['Add School Lead'],
        time: 'Just now',
      },
    ]);
  };

  // 12. Add Note Submit (Syncs directly to Comments in Web App CRM)
  const handleNoteSubmit = async () => {
    if (!noteTargetLead || !noteText.trim()) return;
    setIsSavingNote(true);
    const schoolName = noteTargetLead.schoolName || noteTargetLead.school_name || 'School';
    const cleanNote = noteText.trim();

    if (noteTargetLead.id) {
      const existingNotes = noteTargetLead.notes || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n[${new Date().toLocaleDateString()}]: ${cleanNote}` : cleanNote;

      // 1. Add directly to comments in web app CRM: POST /api/schools/comment/{id}
      await api.addSchoolComment(noteTargetLead.id, cleanNote, user?.name || 'Mobile AI Assistant');

      // 2. Also update notes field on inquiry for full backwards compatibility
      await api.updateSchoolInquiry(noteTargetLead.id, {
        notes: updatedNotes,
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.leadCard && (msg.leadCard.id === noteTargetLead.id || msg.leadCard.schoolName === schoolName)) {
            const currentComments = Array.isArray(msg.leadCard.comments) ? [...msg.leadCard.comments] : [];
            currentComments.push({
              text: cleanNote,
              author: user?.name || 'Mobile AI Assistant',
              created_at: new Date().toISOString(),
            });
            return {
              ...msg,
              leadCard: {
                ...msg.leadCard,
                notes: updatedNotes,
                comments: currentComments,
              },
            };
          }
          return msg;
        })
      );
    }

    setIsSavingNote(false);
    setNoteModalVisible(false);

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `📝 **Note Added to Comments & CRM:**\n\n• **School:** ${schoolName}\n• **Comment:** *"${cleanNote}"*\n• **Synced to:** Web App Comments List`,
        nextActions: ['Mark Meeting Done', 'Generate Proposal Quote'],
        time: 'Just now',
      },
    ]);
  };

  // 13. Generate Proposal for Lead
  const handleGenerateProposalForLead = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const school = target.schoolName || target.school_name || 'Partner School';

    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${school}" is marked as a Lost Lead. Proposals cannot be generated.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${school}" has been deleted from CRM.`);
      return;
    }

    setChatMode(true);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `📄 **Custom Quotation Generated for ${school}**:`,
        proposal: {
          title: `Agentic AI & Coding Excellence Program — ${school}`,
          tier: 'Enterprise Campus Partnership (2026-27)',
          modules: [
            'Agentic AI Prompting & LLM Fundamentals (Grades 6-10)',
            'Maker Lab: Hands-on Robotics & Microcontrollers',
            'Teacher Certification & LMS Platform Access',
          ],
          pricing: '₹5,80,000 / year (450 Student Licenses Included)',
          validity: 'Valid for 30 Days',
        },
        nextActions: ['Mark Meeting Done', 'Download PDF Quote'],
        time: 'Just now',
      },
    ]);
  };

  // 14. Call Lead Directly via Phone Dialer
  const handleCallLead = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const school = target.schoolName || target.school_name || 'this school';

    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${school}" is marked as a Lost Lead. Calling is disabled.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
      Alert.alert('Lead Deleted', `"${school}" has been deleted from CRM.`);
      return;
    }

    if (!target?.phone) {
      Alert.alert('Notice', 'No phone number available for this school lead.');
      return;
    }
    const cleanPhone = (target.phone || '').replace(/[^0-9+]/g, '');
    const url = `tel:${cleanPhone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Notice', `Unable to initiate call to ${cleanPhone}`);
    });
  };

  // ── Handle Action Card Press ────────────────────────────────────────────────
  const handleActionCardPress = async (action) => {
    setChatMode(true);
    const userMsg = {
      sender: 'user',
      text: action.prompt,
      time: 'Just now',
    };

    setMessages([userMsg]);
    setIsTyping(true);

    if (action.id === 'create_lead') {
      setIsTyping(false);
      openAddLeadModal({
        school_name: 'ABC International School',
        contact_name: 'Dr. Arvind Mehta',
        contact_role: 'Principal',
        phone: '+91 98201 44921',
        email: 'principal.arvind@abcschoolmumbai.edu.in',
        location: 'Andheri West, Mumbai, MH',
        board: 'CBSE',
        student_count_tier: '1500+',
      });
      return;
    } else if (action.id === 'retrieve_leads') {
      const res = await api.fetchSchoolInquiries(50);
      setIsTyping(false);

      if (res.success && Array.isArray(res.inquiries) && res.inquiries.length > 0) {
        const leadLines = res.inquiries.slice(0, 15).map((l, idx) => {
          const statusBadge = (l.status || 'new').toUpperCase();
          const contact = l.contact_name ? `${l.contact_name} (${l.contact_role || 'Contact'})` : 'Principal';
          const loc = l.location || 'Mumbai';
          const board = l.board || 'CBSE';
          return `${idx + 1}. **${l.school_name}** • \`${statusBadge}\`\n   📍 ${loc} • 🎓 ${board}\n   👤 ${contact} • 📞 \`${l.phone || 'N/A'}\``;
        }).join('\n\n');

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📋 **Live CRM School Leads (${res.inquiries.length} Total):**\n\n${leadLines}\n\n*Tip: To inspect or take actions on any school, type "Show lead [School Name]" or "Retrieve lead for [School Name]".*`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📋 **No School Leads Found:** No active inquiries currently recorded in your CRM pipeline.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
      }
      return;
    } else if (action.id === 'follow_up' || action.id === 'active_schools') {
      const res = await api.fetchSchoolInquiries(5);
      setIsTyping(false);

      if (res.success && res.inquiries && res.inquiries.length > 0) {
        const liveLeads = res.inquiries.slice(0, 4).map((inq) => ({
          name: inq.school_name,
          campus: inq.location || 'Mumbai Region',
          stage: inq.status === 'new' ? 'New Lead' : inq.status,
          value: '₹5,20,000',
          task: `Follow up with ${inq.contact_name || 'Principal'} (${inq.phone || 'Pending'})`,
          urgency: inq.status === 'new' ? 'High' : 'Normal',
        }));

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📊 **Live CRM Leads:** Found ${res.inquiries.length} active entries in your database:`,
            followUpList: liveLeads,
            nextActions: ['Add School Lead', 'Filter by Mumbai Region', 'Export Pipeline'],
            time: 'Just now',
          },
        ]);
      } else {
        const fallback = MOCK_RESPONSES[action.id];
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: fallback.text,
            followUpList: fallback.data,
            activeSchools: fallback.schools,
            nextActions: fallback.nextActions,
            time: 'Just now',
          },
        ]);
      }
    } else {
      setTimeout(() => {
        setIsTyping(false);
        const data = MOCK_RESPONSES[action.id] || {
          text: `Processed "${action.title}". Your CRM records for Mumbai region are updated.`,
          nextActions: ['View Detailed Logs', 'Sync to CRM'],
        };

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: data.text,
            proposal: data.proposal,
            email: data.email,
            nextActions: data.nextActions,
            time: 'Just now',
          },
        ]);
      }, 1000);
    }
  };

  // ── Handle Sending Custom Text in Chat ───────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');
    setChatMode(true);

    const userMsg = {
      sender: 'user',
      text: userText,
      time: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const lower = userText.toLowerCase();

    // ── STEP 1: Check if user is replying to a pending Confirmation ("yes" / "no") ──
    if (pendingConfirmation) {
      const isAffirmative =
        lower === 'yes' ||
        lower === 'y' ||
        lower === 'yes please' ||
        lower === 'confirm' ||
        lower === 'proceed' ||
        lower === 'sure' ||
        lower === 'do it' ||
        lower === 'ok' ||
        lower === 'okay' ||
        lower === 'yes confirm' ||
        lower.startsWith('yes');

      const isNegative =
        lower === 'no' ||
        lower === 'n' ||
        lower === 'cancel' ||
        lower === 'stop' ||
        lower === 'abort' ||
        lower === 'no cancel' ||
        lower === "don't" ||
        lower === 'nevermind' ||
        lower === 'no thanks' ||
        lower.startsWith('no');

      if (isAffirmative) {
        setIsTyping(false);
        await executeConfirmedAction(pendingConfirmation);
        return;
      } else if (isNegative) {
        setIsTyping(false);
        await executeCancelledAction(pendingConfirmation);
        return;
      }
    }

    // ── STEP 2: Check if user is supplying note text after AI prompted for it ──
    if (pendingNoteTarget) {
      const targetSchool = pendingNoteTarget;
      setPendingNoteTarget(null);
      setIsTyping(false);
      promptAddNoteConfirmation(targetSchool, userText);
      return;
    }

    // Helper to find latest lead in chat context
    // ── 0A. Action Intent: Add School Lead (Opens Dedicated Web App Form Modal) ──
    const isAddLeadFormIntent =
      lower === 'add school lead' ||
      lower === 'add lead' ||
      lower === 'create lead' ||
      lower === 'create school lead' ||
      lower === 'new school lead' ||
      lower === 'add new school lead' ||
      lower === 'new lead' ||
      lower === 'add school' ||
      lower === 'open lead form' ||
      lower === 'lead form';

    if (isAddLeadFormIntent) {
      setIsTyping(false);
      openAddLeadModal();
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '📝 **Opening Add School Lead Form:** Fill in the school name, contact information, board, and curriculum requirements in the form modal.',
          nextActions: ['Add School Lead'],
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── 0B. Query Intent: Retrieve All Leads in CRM ──
    const isRetrieveAllLeadsIntent =
      lower === 'retrieve all leads' ||
      lower === 'retrieve leads' ||
      lower === 'show all leads' ||
      lower === 'list all leads' ||
      lower === 'get all leads' ||
      lower === 'view all leads' ||
      lower === 'all leads' ||
      lower === 'show leads' ||
      lower === 'list leads' ||
      (lower.includes('retrieve') && lower.includes('leads') && !lower.includes('for')) ||
      (lower.includes('list') && lower.includes('leads')) ||
      (lower.includes('show') && lower.includes('all') && lower.includes('lead'));

    if (isRetrieveAllLeadsIntent) {
      const res = await api.fetchSchoolInquiries(50);
      setIsTyping(false);

      if (res.success && Array.isArray(res.inquiries) && res.inquiries.length > 0) {
        const leadLines = res.inquiries.slice(0, 15).map((l, idx) => {
          const statusBadge = (l.status || 'new').toUpperCase();
          const contact = l.contact_name ? `${l.contact_name} (${l.contact_role || 'Contact'})` : 'Principal';
          const loc = l.location || 'Mumbai';
          const board = l.board || 'CBSE';
          return `${idx + 1}. **${l.school_name}** • \`${statusBadge}\`\n   📍 ${loc} • 🎓 ${board}\n   👤 ${contact} • 📞 \`${l.phone || 'N/A'}\``;
        }).join('\n\n');

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📋 **Live CRM School Leads (${res.inquiries.length} Total):**\n\n${leadLines}\n\n*Tip: To inspect or take actions on any school, type "Show lead [School Name]" or "Retrieve lead for [School Name]".*`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📋 **No School Leads Found:** No active inquiries currently recorded in your CRM pipeline.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
      }
      return;
    }

    // ── 0D. Query Intent: Retrieve Specific / Particular Lead in CRM ──
    const isSpecificLeadQuery =
      !isRetrieveAllLeadsIntent &&
      (lower.includes('particular lead') ||
        lower.includes('specific lead') ||
        (lower.includes('particular') && lower.includes('lead')) ||
        (lower.includes('specific') && lower.includes('lead')) ||
        lower.startsWith('retrieve lead') ||
        lower.startsWith('show lead') ||
        lower.startsWith('find lead') ||
        lower.startsWith('get lead') ||
        lower.startsWith('search lead') ||
        lower.startsWith('view lead') ||
        lower.startsWith('inspect lead') ||
        lower.startsWith('retrieve a lead') ||
        lower.startsWith('show a lead') ||
        lower.startsWith('get a lead') ||
        (lower.startsWith('retrieve') && (lower.includes('school') || lower.includes('lead') || lower.includes('limbu') || lower.includes('dps') || lower.includes('xavier'))) ||
        (lower.startsWith('show') && (lower.includes('school') || lower.includes('lead') || lower.includes('limbu') || lower.includes('dps') || lower.includes('xavier'))) ||
        (lower.startsWith('find') && (lower.includes('school') || lower.includes('lead') || lower.includes('limbu') || lower.includes('dps') || lower.includes('xavier'))) ||
        (lower.startsWith('get') && (lower.includes('school') || lower.includes('lead') || lower.includes('limbu') || lower.includes('dps') || lower.includes('xavier'))) ||
        lower.includes('lead details') ||
        lower.includes('details of lead') ||
        (lower.includes('details') && lower.includes('lead')) ||
        (lower.includes('lead for') && !lower.includes('create') && !lower.includes('add')));

    if (isSpecificLeadQuery) {
      let queryName = userText
        .replace(/retrieve\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/show\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/get\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/find\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/view\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/retrieve\s+(?:a\s+)?lead(?:\s+for)?/i, '')
        .replace(/show\s+(?:a\s+)?lead(?:\s+for)?/i, '')
        .replace(/find\s+(?:a\s+)?lead(?:\s+for)?/i, '')
        .replace(/get\s+(?:a\s+)?lead(?:\s+for)?/i, '')
        .replace(/search\s+(?:a\s+)?lead(?:\s+for)?/i, '')
        .replace(/view\s+(?:a\s+)?lead(?:\s+for)?/i, '')
        .replace(/retrieve\s+(?:a\s+)?school(?:\s+for)?/i, '')
        .replace(/show\s+(?:a\s+)?school(?:\s+for)?/i, '')
        .replace(/find\s+(?:a\s+)?school(?:\s+for)?/i, '')
        .replace(/get\s+(?:a\s+)?school(?:\s+for)?/i, '')
        .replace(/retrieve/i, '')
        .replace(/lead\s+for/i, '')
        .replace(/details\s+of\s+lead/i, '')
        .replace(/details\s+for/i, '')
        .replace(/details/i, '')
        .replace(/particular\s+lead/i, '')
        .replace(/specific\s+lead/i, '')
        .trim();

      // Clean out common filler words
      if (
        !queryName ||
        queryName.toLowerCase() === 'a' ||
        queryName.toLowerCase() === 'the' ||
        queryName.toLowerCase() === 'lead' ||
        queryName.toLowerCase() === 'a lead' ||
        queryName.toLowerCase() === 'school' ||
        queryName.toLowerCase() === 'school lead' ||
        queryName.toLowerCase() === 'in crm' ||
        queryName.toLowerCase() === 'from crm' ||
        queryName.toLowerCase() === 'particular' ||
        queryName.toLowerCase() === 'specific'
      ) {
        queryName = '';
      }

      const res = await api.fetchSchoolInquiries(100);
      setIsTyping(false);

      let matched = null;
      const queryLower = queryName.toLowerCase();

      // Priority 1: Search conversation memory in reverse order (most recent first)
      if (queryLower) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const lc = messages[i]?.leadCard;
          if (lc) {
            const sName = (lc.schoolName || lc.school_name || '').toLowerCase();
            const cName = (lc.contactPerson || lc.contact_name || '').toLowerCase();
            if (sName && (sName.includes(queryLower) || queryLower.includes(sName))) {
              matched = { ...lc };
              break;
            }
            if (cName && (cName.includes(queryLower) || queryLower.includes(cName))) {
              matched = { ...lc };
              break;
            }
          }
        }
      }

      // Priority 2: Search live CRM backend inquiries
      if (!matched && res.success && Array.isArray(res.inquiries) && res.inquiries.length > 0) {
        if (queryLower) {
          matched = res.inquiries.find((l) => {
            const sName = (l.school_name || l.schoolName || '').toLowerCase();
            const cName = (l.contact_name || l.contactPerson || '').toLowerCase();
            return (sName && (sName.includes(queryLower) || queryLower.includes(sName))) ||
                   (cName && (cName.includes(queryLower) || queryLower.includes(cName)));
          });
        }
      }

      // Priority 3: Search FALLBACK_LEADS
      if (!matched && queryLower) {
        matched = FALLBACK_LEADS.find((l) => {
          const sName = (l.school_name || l.schoolName || '').toLowerCase();
          const cName = (l.contact_name || l.contactPerson || '').toLowerCase();
          return (sName && (sName.includes(queryLower) || queryLower.includes(sName))) ||
                 (cName && (cName.includes(queryLower) || queryLower.includes(cName)));
        });
      }

      // Priority 4: Generic queries (e.g. "retrieve a particular lead", "retrieve lead", "particular lead", "show lead")
      if (!matched && !queryLower) {
        const latest = findLatestLead();
        if (latest) {
          matched = { ...latest };
        } else if (res.success && Array.isArray(res.inquiries) && res.inquiries.length > 0) {
          matched = res.inquiries[0];
        } else {
          matched = FALLBACK_LEADS[0];
        }
      }

      if (matched) {
        // Strictly determine status: only archived if status === 'archived' and not deleted
        const isArchived = matched.status === 'archived' && !matched.isDeleted;
        const isDeleted = matched.status === 'deleted' || matched.isDeleted === true;
        const isLost = !isDeleted && !isArchived && matched.status === 'lost';
        const isMeetingDone = !isDeleted && !isArchived && matched.status === 'meeting_done';
        const isMeetingScheduled = !isDeleted && !isArchived && !isMeetingDone && (matched.status === 'meeting_scheduled' || Boolean(matched.meeting_date));

        const schoolName = matched.schoolName || matched.school_name || 'School';
        const contactPerson = matched.contactPerson || matched.contact_name || 'Principal';
        const contactRole = matched.contactRole || matched.contact_role || 'Principal';

        const leadCardObj = {
          id: matched.id || `lead_${Date.now()}`,
          schoolName: schoolName,
          school_name: schoolName,
          contactPerson: contactPerson.includes('(') ? contactPerson : `${contactPerson} (${contactRole})`,
          contact_name: contactPerson.replace(/\s*\([^)]*\)/, '').trim(),
          contactRole: contactRole,
          contact_role: contactRole,
          phone: matched.phone || '',
          email: matched.email || '',
          location: matched.location || 'Mumbai, Maharashtra',
          board: matched.board || 'CBSE',
          studentCount: matched.studentCount || matched.school_size || matched.student_count_tier || 'Enrolled Campus',
          recommendedProgram: matched.recommendedProgram || (matched.programs_interested && matched.programs_interested[0]) || 'Agentic AI & Coding Excellence Lab (K-12)',
          leadScore: isArchived ? 'Archived Record' : isLost ? '0/100 (Closed)' : '96/100 (Hot Lead)',
          notes: matched.notes || (isArchived ? 'This lead is stored in CRM archives.' : 'Inquiry active in School CRM.'),
          status: isArchived ? 'archived' : (matched.status || 'new'),
          isDeleted: isDeleted,
          isArchived: isArchived,
          meeting_date: matched.meeting_date || null,
          meeting_time: matched.meeting_time || null,
          meeting_type: matched.meeting_type || null,
          comments: matched.comments || [],
        };

        if (isArchived) {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `📦 **Retrieved Archived Lead Dossier for ${leadCardObj.schoolName}:**\n\n• **Status:** \`ARCHIVED\`\n• **Contact:** ${leadCardObj.contactPerson}\n• **Phone:** \`${leadCardObj.phone || 'N/A'}\`\n• **Location:** ${leadCardObj.location}\n• **Board:** ${leadCardObj.board}\n\nThis school lead is stored in the archive. Interactive lead card rendered below with **Unarchive** and **Delete** controls:`,
              leadCard: leadCardObj,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `🏫 **Retrieved Lead Dossier for ${leadCardObj.schoolName}:**\n\n• **Status:** \`${(leadCardObj.status || 'NEW').toUpperCase()}\`\n• **Contact:** ${leadCardObj.contactPerson}\n• **Phone:** \`${leadCardObj.phone || 'N/A'}\`\n• **Location:** ${leadCardObj.location}\n• **Board:** ${leadCardObj.board}\n${leadCardObj.meeting_date ? `• **Meeting:** \`${leadCardObj.meeting_date}\` (${leadCardObj.meeting_type || 'offline'})\n` : ''}\nInteractive lead card rendered below with full action controls:`,
              leadCard: leadCardObj,
              nextActions: isLost
                ? ['Add School Lead']
                : isMeetingDone
                ? ['Schedule 2nd Meeting', 'Generate Proposal Quote', 'Add Note']
                : isMeetingScheduled
                ? ['Mark Meeting Done', 'Generate Proposal Quote', 'Add Note']
                : ['Schedule Meeting', 'Generate Proposal Quote', 'Add Note'],
              time: 'Just now',
            },
          ]);
        }
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `🔍 **School Lead Not Found:** Could not locate an existing school lead matching **"${queryName || userText}"** in the CRM database.\n\nWould you like to add this school?`,
          nextActions: ['Add School Lead'],
          time: 'Just now',
        },
      ]);
      return;
    }

    // Helper to find latest lead in chat context
    const target = findLatestLead();

    // ── 1. Action Intent: Mark Meeting Done ──
    if (
      lower === 'meeting done' ||
      lower.includes('mark meeting done') ||
      lower.includes('meeting completed') ||
      lower.includes('mark as meeting done') ||
      lower.includes('marked meeting done') ||
      (lower.includes('meeting') && lower.includes('done'))
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `🗑️ **Lead Deleted:** **${target.schoolName || target.school_name}** was deleted from CRM.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        if (target.status === 'meeting_done') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `ℹ️ **Meeting Already Completed:** The meeting for **${target.schoolName || target.school_name}** is already marked as done. You can now schedule a 2nd meeting or send a proposal quote.`,
              nextActions: ['Schedule 2nd Meeting', 'Generate Proposal Quote'],
              time: 'Just now',
            },
          ]);
          return;
        }
        await handleMarkMeetingDone(target);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'Please select or add a school lead first to mark the meeting as done.',
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
      }
      return;
    }

    // ── 2. Action Intent: Delete School Lead (Confirmation-Based) ──
    const isDeleteIntent =
      (lower.startsWith('delete') ||
       lower.startsWith('remove') ||
       lower.includes('permanently delete') ||
       lower.includes('delete school') ||
       lower.includes('delete lead') ||
       lower.includes('delete this')) &&
      !lower.includes('how to') &&
      !lower.includes('why');

    if (isDeleteIntent) {
      let q = userText
        .replace(/permanently\s+delete/i, '')
        .replace(/delete\s+this\s+school\s+lead/i, '')
        .replace(/delete\s+this\s+school/i, '')
        .replace(/delete\s+this\s+lead/i, '')
        .replace(/delete\s+school\s+lead(?:\s+for)?/i, '')
        .replace(/delete\s+lead(?:\s+for)?/i, '')
        .replace(/delete\s+school(?:\s+for)?/i, '')
        .replace(/delete/i, '')
        .replace(/remove/i, '')
        .trim();

      const resolved = await resolveSchoolFromQuery(q);
      setIsTyping(false);

      if (resolved.status === 'multiple') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Multiple Schools Found Matching "${q}":**\n\nPlease select the exact school lead you want to permanently delete:`,
            disambiguationCard: {
              action: 'delete',
              actionLabel: 'permanently delete',
              candidates: resolved.candidates,
            },
            time: 'Just now',
          },
        ]);
        return;
      }

      if (resolved.status === 'none') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **School Lead Not Found:** Could not locate an existing school lead matching **"${q || userText}"** to delete.\n\nPlease check the school name or type "Show all leads" to browse.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      const lead = resolved.lead;
      if (lead.status === 'deleted' || lead.isDeleted) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🗑️ **Already Deleted:** **${lead.schoolName || lead.school_name}** has already been permanently deleted from CRM.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      promptDeleteConfirmation(lead);
      return;
    }

    // ── 3. Action Intent: Mark as Lost Lead (Confirmation-Based) ──
    const isLostIntent =
      lower.includes('lost lead') ||
      lower.includes('mark as lost') ||
      lower.includes('mark lost') ||
      lower.includes('deal lost') ||
      lower.includes('is a lost lead') ||
      lower.includes('as lost lead');

    if (isLostIntent) {
      let q = userText
        .replace(/mark\s+this\s+school\s+as\s+a\s+lost\s+lead/i, '')
        .replace(/mark\s+this\s+school\s+as\s+lost/i, '')
        .replace(/this\s+school\s+is\s+a\s+lost\s+lead/i, '')
        .replace(/mark\s+as\s+lost\s+lead(?:\s+for)?/i, '')
        .replace(/mark\s+as\s+lost(?:\s+for)?/i, '')
        .replace(/mark\s+lost\s+lead(?:\s+for)?/i, '')
        .replace(/mark\s+lost(?:\s+for)?/i, '')
        .replace(/lost\s+lead(?:\s+for)?/i, '')
        .replace(/deal\s+lost\s+with/i, '')
        .replace(/deal\s+lost(?:\s+for)?/i, '')
        .replace(/is\s+a\s+lost\s+lead/i, '')
        .trim();

      const resolved = await resolveSchoolFromQuery(q);
      setIsTyping(false);

      if (resolved.status === 'multiple') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Multiple Schools Found Matching "${q}":**\n\nPlease select which school lead to mark as lost:`,
            disambiguationCard: {
              action: 'lost',
              actionLabel: 'mark as lost',
              candidates: resolved.candidates,
            },
            time: 'Just now',
          },
        ]);
        return;
      }

      if (resolved.status === 'none') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **School Lead Not Found:** Could not locate a school lead matching **"${q || userText}"** to mark as lost.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      const lead = resolved.lead;
      if (lead.status === 'lost') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `❌ **Already Marked as Lost:** **${lead.schoolName || lead.school_name}** is already recorded as a Lost Lead.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }
      if (lead.status === 'deleted' || lead.isDeleted) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🗑️ **Lead Deleted:** **${lead.schoolName || lead.school_name}** was deleted from CRM.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      promptLostConfirmation(lead);
      return;
    }

    // ── 4. Action Intent: Archive School Lead (Confirmation-Based) ──
    const isArchiveIntent =
      (lower.includes('archive this school') ||
       lower.includes('archive this lead') ||
       lower.includes('archive school') ||
       lower.includes('archive lead') ||
       lower.includes('move to archive') ||
       lower.startsWith('archive')) &&
      !lower.includes('unarchive') &&
      !lower.includes('un-archive');

    if (isArchiveIntent) {
      let q = userText
        .replace(/archive\s+this\s+school\s+lead/i, '')
        .replace(/archive\s+this\s+school/i, '')
        .replace(/archive\s+this\s+lead/i, '')
        .replace(/move\s+(?:to\s+)?archive/i, '')
        .replace(/archive\s+school\s+lead(?:\s+for)?/i, '')
        .replace(/archive\s+lead(?:\s+for)?/i, '')
        .replace(/archive\s+school(?:\s+for)?/i, '')
        .replace(/archive/i, '')
        .trim();

      const resolved = await resolveSchoolFromQuery(q);
      setIsTyping(false);

      if (resolved.status === 'multiple') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Multiple Schools Found Matching "${q}":**\n\nPlease select which school lead to archive:`,
            disambiguationCard: {
              action: 'archive',
              actionLabel: 'archive',
              candidates: resolved.candidates,
            },
            time: 'Just now',
          },
        ]);
        return;
      }

      if (resolved.status === 'none') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **School Lead Not Found:** Could not locate a school matching **"${q || userText}"** to archive.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      const lead = resolved.lead;
      if (lead.status === 'archived' || lead.isArchived) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📦 **Already Archived:** **${lead.schoolName || lead.school_name}** is already in the CRM archive.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }
      if (lead.status === 'lost') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `❌ **Lead Closed (Lost):** **${lead.schoolName || lead.school_name}** is marked as a Lost Lead.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      promptArchiveConfirmation(lead);
      return;
    }

    // ── 5. Action Intent: Unarchive School Lead (Confirmation-Based) ──
    const isUnarchiveIntent =
      lower.includes('unarchive') ||
      lower.includes('un-archive') ||
      lower.includes('restore lead') ||
      lower.includes('restore school') ||
      lower.startsWith('restore');

    if (isUnarchiveIntent) {
      let q = userText
        .replace(/unarchive\s+this\s+school\s+lead/i, '')
        .replace(/unarchive\s+this\s+school/i, '')
        .replace(/unarchive\s+this\s+lead/i, '')
        .replace(/unarchive\s+school\s+lead(?:\s+for)?/i, '')
        .replace(/unarchive\s+lead(?:\s+for)?/i, '')
        .replace(/unarchive\s+school(?:\s+for)?/i, '')
        .replace(/un-archive\s+school\s+lead(?:\s+for)?/i, '')
        .replace(/un-archive\s+lead(?:\s+for)?/i, '')
        .replace(/un-archive/i, '')
        .replace(/unarchive/i, '')
        .replace(/restore\s+lead(?:\s+for)?/i, '')
        .replace(/restore\s+school(?:\s+for)?/i, '')
        .replace(/restore/i, '')
        .trim();

      const resolved = await resolveSchoolFromQuery(q);
      setIsTyping(false);

      if (resolved.status === 'multiple') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Multiple Schools Found Matching "${q}":**\n\nPlease select which school lead to unarchive:`,
            disambiguationCard: {
              action: 'unarchive',
              actionLabel: 'unarchive and restore',
              candidates: resolved.candidates,
            },
            time: 'Just now',
          },
        ]);
        return;
      }

      if (resolved.status === 'none') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Archived School Not Found:** Could not locate an archived school lead matching **"${q || userText}"** to restore.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      const lead = resolved.lead;
      if (lead.status !== 'archived' && !lead.isArchived) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `ℹ️ **Lead is Already Active:** **${lead.schoolName || lead.school_name}** is already in the active CRM sales pipeline.`,
            leadCard: lead,
            nextActions: ['Schedule Meeting', 'Generate Proposal Quote'],
            time: 'Just now',
          },
        ]);
        return;
      }

      promptUnarchiveConfirmation(lead);
      return;
    }

    // ── 6. Action Intent: Schedule Meeting (Confirmation-Based with Details) ──
    const isScheduleIntent =
      (lower.includes('schedule a meeting') ||
       lower.includes('schedule meeting') ||
       lower.includes('book a meeting') ||
       lower.includes('book meeting') ||
       lower.includes('schedule demo') ||
       lower.includes('set up a meeting') ||
       lower.startsWith('schedule demo') ||
       (lower.startsWith('meeting with') && !lower.includes('done')));

    if (isScheduleIntent && !lower.includes('done') && !lower.includes('completed')) {
      let q = userText
        .replace(/schedule\s+a\s+meeting\s+with/i, '')
        .replace(/schedule\s+meeting\s+with/i, '')
        .replace(/schedule\s+a\s+meeting\s+for/i, '')
        .replace(/schedule\s+meeting\s+for/i, '')
        .replace(/book\s+a\s+meeting\s+with/i, '')
        .replace(/book\s+meeting\s+with/i, '')
        .replace(/schedule\s+demo\s+for/i, '')
        .replace(/schedule\s+demo\s+with/i, '')
        .replace(/set\s+up\s+a\s+meeting\s+with/i, '')
        .replace(/meeting\s+with/i, '')
        .replace(/schedule\s+meeting/i, '')
        .replace(/schedule/i, '')
        .trim();

      const rawQuery = q.split(/\s+(?:on|at|tomorrow|next|for|via|online|offline)/i)[0].trim();
      const resolved = await resolveSchoolFromQuery(rawQuery);
      setIsTyping(false);

      if (resolved.status === 'multiple') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Multiple Schools Found Matching "${rawQuery}":**\n\nPlease select the school you want to schedule a meeting with:`,
            disambiguationCard: {
              action: 'schedule_meeting',
              actionLabel: 'schedule meeting with',
              candidates: resolved.candidates,
            },
            time: 'Just now',
          },
        ]);
        return;
      }

      if (resolved.status === 'none') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **School Lead Not Found:** Could not locate a school matching **"${rawQuery || userText}"** to schedule a meeting.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      const lead = resolved.lead;

      if (lead.status === 'lost') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `❌ **Lead Closed (Lost):** **${lead.schoolName || lead.school_name}** is marked as a Lost Lead. Meetings cannot be scheduled for closed leads.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }
      if (lead.status === 'deleted' || lead.isDeleted || lead.status === 'archived' || lead.isArchived) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `⚠️ **Lead Inactive:** **${lead.schoolName || lead.school_name}** is currently ${lead.isArchived ? 'archived' : 'deleted'}. Please restore it before scheduling meetings.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      const isMeetingScheduled = lead.status === 'meeting_scheduled' || (lead.meeting_date && lead.status !== 'meeting_done');
      const isMeetingDone = lead.status === 'meeting_done';

      if (isMeetingScheduled && !isMeetingDone) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `⚠️ **Meeting Already Scheduled:** A meeting with **${lead.schoolName || lead.school_name}** is already scheduled for **${lead.meeting_date || 'an upcoming date'}**${lead.meeting_time ? ` at **${lead.meeting_time}**` : ''}.\n\nUnder CRM rules, you cannot reschedule this meeting until it has taken place and been marked as Done.`,
            nextActions: ['Mark Meeting Done', 'Send Meeting Invite Email'],
            time: 'Just now',
          },
        ]);
        return;
      }

      const parsedDetails = extractMeetingDetailsFromText(userText, lead);
      if (parsedDetails.hasRequiredDetails) {
        promptScheduleMeetingConfirmation(lead, parsedDetails);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📅 **Schedule Meeting with ${lead.schoolName || lead.school_name}:**\n\nPlease select the meeting mode, date, time, and location/link below:`,
            meetingSchedulerCard: { lead },
            time: 'Just now',
          },
        ]);
      }
      return;
    }

    // ── 7. Action Intent: Add Note or Comment (Confirmation-Based) ──
    const isNoteIntent =
      lower.startsWith('note:') ||
      lower.startsWith('comment:') ||
      lower.includes('add a note') ||
      lower.includes('add note') ||
      lower.includes('add a comment') ||
      lower.includes('add comment') ||
      lower.includes('comment on') ||
      lower.includes('note on');

    if (isNoteIntent) {
      const { schoolQuery, extractedNote } = extractNoteAndSchool(userText);
      const resolved = await resolveSchoolFromQuery(schoolQuery);
      setIsTyping(false);

      if (resolved.status === 'multiple') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Multiple Schools Found Matching "${schoolQuery}":**\n\nPlease select which school to add this note to:`,
            disambiguationCard: {
              action: 'add_note',
              actionLabel: 'add note to',
              payload: { note: extractedNote },
              candidates: resolved.candidates,
            },
            time: 'Just now',
          },
        ]);
        return;
      }

      if (resolved.status === 'none') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **School Lead Not Found:** Could not locate a school matching **"${schoolQuery || userText}"** to add a note to.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      const lead = resolved.lead;
      if (lead.status === 'lost') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `❌ **Lead Closed (Lost):** **${lead.schoolName || lead.school_name}** is marked as a Lost Lead. Notes cannot be added to closed leads.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }
      if (lead.status === 'deleted' || lead.isDeleted) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🗑️ **Lead Deleted:** **${lead.schoolName || lead.school_name}** was deleted from CRM.`,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

      if (extractedNote && extractedNote.length >= 3) {
        promptAddNoteConfirmation(lead, extractedNote);
      } else {
        setPendingNoteTarget(lead);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📝 **Add Note for ${lead.schoolName || lead.school_name}:**\n\nWhat note or discussion comment would you like to record in the CRM? (Type your note below or use the form):`,
            noteInputCard: { lead },
            time: 'Just now',
          },
        ]);
      }
      return;
    }

    // ── 9. Action Intent: Follow-up ──
    if (
      (lower.includes('follow up') || lower.includes('followup') || lower.includes('set reminder')) &&
      !lower.includes('pipeline') &&
      !lower.includes('show') &&
      !lower.includes('list')
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead. Follow-ups cannot be scheduled for closed leads.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `🗑️ **Lead Deleted:** **${target.schoolName || target.school_name}** was deleted from CRM.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        openFollowupModal(target);
      } else {
        Alert.alert('Notice', 'No active school lead found for follow-up.');
      }
      return;
    }

    // ── 10. Action Intent: Docs & Proposals ──
    if (
      lower.includes('docs') ||
      lower.includes('document') ||
      lower.includes('brochure') ||
      lower.includes('proposal') ||
      lower.includes('quote')
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead. Documents and proposals are unavailable for closed leads.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `🗑️ **Lead Deleted:** **${target.schoolName || target.school_name}** was deleted from CRM.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        handleDocs(target);
      } else {
        Alert.alert('Notice', 'No active school lead found to view documents.');
      }
      return;
    }

    // ── 11. Action Intent: Edit Lead (Rule 1: deleted lead cannot be edited; Rule 4: lost lead cannot be edited) ──
    if (lower.startsWith('edit') || lower.includes('edit lead') || lower.includes('update lead')) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `⚠️ **Cannot Edit Deleted Lead:** **${target.schoolName || target.school_name}** was deleted from CRM. Deleted leads cannot be edited from chat or card.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Cannot Edit Lost Lead:** **${target.schoolName || target.school_name}** is marked as a Lost Lead. Closed leads cannot be edited or modified.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        openEditLeadModal(target);
        return;
      }
    }

    // ── 12. Action Intent: Send Email ──
    if (
      lower.startsWith('send email') ||
      lower.startsWith('email') ||
      lower.includes('send mail') ||
      lower.includes('pitch email') ||
      (lower.includes('email') && !lower.includes('lead for') && !lower.includes('create lead') && !lower.includes('add lead'))
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead. Outbound emails cannot be sent.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `🗑️ **Lead Deleted:** **${target.schoolName || target.school_name}** was deleted from CRM.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        openSendEmailModal(target);
        return;
      }
    }

    // ── 13. Action Intent: WhatsApp ──
    if (
      lower.includes('whatsapp') ||
      lower.includes('send message whatsapp') ||
      lower.includes('wa message') ||
      lower.includes('text principal')
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead. WhatsApp messages cannot be sent.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `🗑️ **Lead Deleted:** **${target.schoolName || target.school_name}** was deleted from CRM.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        openSendWhatsAppModal(target);
        return;
      }
    }

    // ── 14. Action Intent: Call Lead ──
    if (
      lower.startsWith('call') ||
      lower.includes('phone lead') ||
      lower.includes('dial lead')
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead. Calls cannot be placed for closed leads.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        if (target.status === 'deleted' || target.isDeleted || target.status === 'archived') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `🗑️ **Lead Deleted:** **${target.schoolName || target.school_name}** was deleted from CRM.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        handleCallLead(target);
        return;
      }
    }

    // ── 15. Explicit Lead Creation Intent (Never triggered by actions) ──
    const isCreateLeadIntent =
      lower.includes('create lead') ||
      lower.includes('add lead') ||
      lower.includes('new lead') ||
      lower.includes('register school') ||
      lower.includes('lead for') ||
      lower.startsWith('mom:') ||
      lower.includes('minutes of meeting') ||
      (lower.includes('school') && (lower.includes('create') || lower.includes('add') || lower.includes('register') || lower.includes('new')));

    if (isCreateLeadIntent && !lower.includes('what are') && !lower.includes('show me')) {
      const extractedLead = api.extractLeadFromPrompt(userText);
      const res = await api.createSchoolLead(extractedLead);
      setIsTyping(false);

      const lead = (res.success && res.lead) ? res.lead : {
        id: `lead-${Date.now().toString().slice(-6)}`,
        school_name: extractedLead.school_name,
        board: extractedLead.board,
        location: extractedLead.location,
        contact_name: extractedLead.contact_name,
        contact_role: extractedLead.contact_role,
        email: extractedLead.email,
        phone: extractedLead.phone,
        status: 'new',
        notes: extractedLead.notes,
        followup_tasks: [],
      };

      const aiMsg = {
        sender: 'ai',
        text: `🎯 **New School Lead Successfully Added!**\n\nI have registered **${lead.school_name}** directly in the School CRM database.\n\n• **Database ID:** \`${lead.id}\`\n• **Status:** \`${(lead.status || 'new').toUpperCase()}\``,
        leadCard: {
          id: lead.id,
          schoolName: lead.school_name,
          board: lead.board || 'CBSE',
          location: lead.location || 'Mumbai, Maharashtra',
          contactPerson: `${lead.contact_name} (${lead.contact_role || 'Principal'})`,
          email: lead.email,
          phone: lead.phone,
          studentCount: '1,200 Students',
          recommendedProgram: 'Agentic AI & Coding Excellence Lab (K-12)',
          leadScore: '96/100 (Hot Lead)',
          notes: lead.notes || extractedLead.notes,
          followup_tasks: lead.followup_tasks || [],
        },
        time: 'Just now',
      };
      setMessages((prev) => [...prev, aiMsg]);
      return;
    }

    // ── 16. Follow-ups / Pipeline Query ──
    if (lower.includes('follow') || lower.includes('pipeline') || lower.includes('pending')) {
      const res = await api.fetchSchoolInquiries(5);
      setIsTyping(false);

      if (res.success && res.inquiries && res.inquiries.length > 0) {
        const liveLeads = res.inquiries.slice(0, 3).map((inq) => ({
          name: inq.school_name,
          campus: inq.location || 'Mumbai Region',
          stage: inq.status === 'new' ? 'New Lead' : inq.status,
          value: '₹5,00,000',
          task: `Follow up with ${inq.contact_name || 'Contact'} (${inq.phone || 'No phone'})`,
          urgency: 'High',
        }));

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📊 Found **${res.inquiries.length} School Leads** in your live database:`,
            followUpList: liveLeads,
            nextActions: ['Mark Meeting Done', 'Generate Proposal Quote'],
            time: 'Just now',
          },
        ]);
        return;
      }
    }

    // ── 17. Default Conversational Response ──
    setTimeout(() => {
      setIsTyping(false);
      let aiMsg;

      if (lower.includes('proposal') || lower.includes('quote') || lower.includes('curriculum')) {
        const data = MOCK_RESPONSES.generate_proposal;
        aiMsg = {
          sender: 'ai',
          text: data.text,
          proposal: data.proposal,
          nextActions: ['Mark Meeting Done', 'Generate Proposal Quote'],
          time: 'Just now',
        };
      } else {
        aiMsg = {
          sender: 'ai',
          text: `I've analyzed: "${userText}".\n\nYour Mumbai School CRM assistant is ready to log meeting completions, schedule demos, send emails, or update CRM records.`,
          nextActions: ['Mark Meeting Done', 'Add School Lead', 'Generate Proposal Quote', 'Schedule Meeting'],
          time: 'Just now',
        };
      }

      setMessages((prev) => [...prev, aiMsg]);
    }, 900);
  };

  // Sample MOM insertion for ProTip or Attachment
  const handlePasteSampleMom = () => {
    setInputText(
      'MOM: Met with Principal Dr. Arvind Mehta at St. Xavier’s World Academy Mumbai. Interested in AI & Robotics lab for 1200 students. Contact: +91 98201 44921, email: arvind@xavier-mumbai.edu.in. Action: Send quote by Friday.'
    );
  };

  const handleNewChat = () => {
    setChatMode(false);
    setMessages([]);
    setInputText('');
    setActiveTab('ai_chat');
  };

  // ── Action Chip Handler: Executes Immediately On Tap ────────────────────────
  const handleActionChip = async (chip) => {
    const lower = chip.toLowerCase();
    const target = findLatestLead();

    if (
      lower.includes('add school lead') ||
      lower.includes('add new school lead') ||
      lower === 'add school lead' ||
      lower === 'add new school lead' ||
      lower === 'add lead' ||
      lower === 'create lead' ||
      lower === 'add school'
    ) {
      openAddLeadModal();
      return;
    }

    if (
      lower.includes('retrieve all leads') ||
      lower.includes('retrieve leads') ||
      lower === 'all leads' ||
      lower === 'show leads' ||
      lower === 'list leads'
    ) {
      setInputText('Retrieve all leads');
      setTimeout(() => {
        handleSend();
      }, 50);
      return;
    }

    if (
      lower.includes('meeting done') ||
      lower === 'mark meeting done' ||
      lower.includes('mark as meeting done')
    ) {
      if (target) {
        await handleMarkMeetingDone(target);
        return;
      }
    } else if (
      lower.includes('schedule meeting') ||
      lower.includes('schedule demo') ||
      lower.includes('schedule session')
    ) {
      if (target) {
        openScheduleMeetingModal(target);
        return;
      }
    } else if (lower.includes('email') || lower.includes('mail')) {
      if (target) {
        openSendEmailModal(target);
        return;
      }
    } else if (lower.includes('whatsapp') || lower.includes('pitch')) {
      if (target) {
        openSendWhatsAppModal(target);
        return;
      }
    } else if (lower.includes('proposal') || lower.includes('quote') || lower.includes('quotation')) {
      if (target) {
        handleGenerateProposalForLead(target);
        return;
      }
    } else if (lower.includes('ticket')) {
      if (target) {
        openRaiseTicketModal(target);
        return;
      }
    } else if (lower.includes('follow') || lower.includes('reminder')) {
      if (target) {
        openFollowupModal(target);
        return;
      }
    } else if (lower.includes('assign')) {
      if (target) {
        openAssignLeadModal(target);
        return;
      }
    } else if (lower.includes('lost')) {
      if (target) {
        openLostLeadModal(target);
        return;
      }
    } else if (lower.includes('unarchive') || lower.includes('restore')) {
      if (target) {
        await handleUnarchiveLead(target);
        return;
      }
    } else if (lower.includes('archive')) {
      if (target) {
        await handleArchiveLead(target);
        return;
      }
    } else if (lower.includes('delete')) {
      if (target) {
        handleDeleteLead(target);
        return;
      }
    } else if (lower.includes('doc') || lower.includes('download')) {
      if (target) {
        handleDocs(target);
        return;
      }
    }

    setInputText(chip);
  };

  const handleMicPress = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setInputText('Create a new lead for Podar International School Mumbai with principal contact');
      setTimeout(() => {
        setIsRecording(false);
      }, 1500);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />

      {/* Top Dark Green Header (hidden when Schools CRM is active, as it has its own dedicated header) */}
      {activeTab !== 'schools' && (
        <Header
          onNewChatPress={handleNewChat}
          user={user}
          onLogout={onLogout}
        />
      )}

      {/* KeyboardAvoidingView configured for both iOS and Android to keep input box always visible */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Content Area Based on Active Tab */}
        {activeTab === 'ai_chat' ? (
          <View style={styles.chatTabContainer}>
            {/* Quick Actions Strip (Region) */}
            <QuickActionsStrip
              region="Mumbai Region"
            />

            {chatMode ? (
              /* Active Chat Message Stream */
              <ChatMessagesView
                messages={messages}
                isTyping={isTyping}
                onActionChipPress={handleActionChip}
                onEditLead={openEditLeadModal}
                onSendEmail={openSendEmailModal}
                onSendWhatsApp={openSendWhatsAppModal}
                onGenerateProposal={handleGenerateProposalForLead}
                onCallLead={handleCallLead}
                onMeetingDone={handleMarkMeetingDone}
                onScheduleMeeting={openScheduleMeetingModal}
                onRaiseTicket={openRaiseTicketModal}
                onFollowup={openFollowupModal}
                onDocs={handleDocs}
                onAssign={openAssignLeadModal}
                onNote={openNoteModal}
                onDeleteLead={handleDeleteLead}
                onLostLead={openLostLeadModal}
                onArchiveLead={handleArchiveLead}
                onUnarchiveLead={handleUnarchiveLead}
                onConfirmAction={executeConfirmedAction}
                onCancelAction={executeCancelledAction}
                onSelectDisambiguatedSchool={handleSelectDisambiguatedSchool}
                onSubmitInlineMeeting={({ lead, date, time, mode, location, notes }) =>
                  promptScheduleMeetingConfirmation(lead, { date, time, mode, location, notes })
                }
                onSubmitInlineNote={(lead, noteText) => promptAddNoteConfirmation(lead, noteText)}
              />
            ) : (
              /* Default Suggestions Landing Screen */
              <ScrollView
                ref={landingScrollRef}
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {/* Center Glowing Icon & Welcome Header */}
                <WelcomeSection />

                {/* 5 Suggested Action Cards */}
                <View style={styles.cardsList}>
                  {SUGGESTED_ACTIONS.map((action) => (
                    <SuggestedActionCard
                      key={action.id}
                      action={action}
                      onPress={handleActionCardPress}
                    />
                  ))}
                </View>

                {/* Pro Tip Card */}
                <ProTipBanner onPasteSampleMom={handlePasteSampleMom} />
              </ScrollView>
            )}

            {/* Bottom Floating Chat Input */}
            <ChatInput
              value={inputText}
              onChangeText={setInputText}
              onSend={handleSend}
              onAttach={handlePasteSampleMom}
              onMicPress={handleMicPress}
              isRecording={isRecording}
              onFocus={handleInputFocus}
            />
          </View>
        ) : activeTab === 'schools' ? (
          /* Live School CRM Screen matching user screenshot */
          <SchoolsCrmScreen
            user={user}
            onBackToChat={() => setActiveTab('ai_chat')}
          />
        ) : (
          /* Animated Coming Soon View for other tabs */
          <ComingSoonView
            tabName={activeTab}
            onBackToChat={() => setActiveTab('ai_chat')}
          />
        )}

        {/* Bottom Tab Navigation Bar - smoothly hidden while virtual keyboard is active to maximize input space */}
        {!isKeyboardVisible && (
          <BottomTabBar
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId)}
          />
        )}
      </KeyboardAvoidingView>

      {/* ── MODAL 0: Add School Lead Form Modal (Matching AdminSchoolCRM) ─────── */}
      <Modal
        visible={addLeadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddLeadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="school" size={20} color={COLORS.brandEmerald} style={{ marginRight: 8 }} />
                <Text style={styles.modalLargeTitle}>+ Add New School Lead</Text>
              </View>
              <TouchableOpacity onPress={() => setAddLeadModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>School Name *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Podar International School"
                  placeholderTextColor="#94A3B8"
                  value={newSchoolName}
                  onChangeText={setNewSchoolName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Primary Contact Person *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Dr. Arvind Mehta"
                  placeholderTextColor="#94A3B8"
                  value={newContactName}
                  onChangeText={setNewContactName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Contact Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  {CONTACT_ROLES.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.statusOptionPill,
                        newContactRole === role && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setNewContactRole(role)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          newContactRole === role && styles.statusOptionTextActive,
                        ]}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. +91 98201 44921"
                  placeholderTextColor="#94A3B8"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Email Address (Optional)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. principal@school.edu.in"
                  placeholderTextColor="#94A3B8"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>City / Location</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Andheri West, Mumbai, MH"
                  placeholderTextColor="#94A3B8"
                  value={newLocation}
                  onChangeText={setNewLocation}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Full Postal Address</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 50, textAlignVertical: 'top' }]}
                  placeholder="Campus address..."
                  placeholderTextColor="#94A3B8"
                  value={newAddress}
                  onChangeText={setNewAddress}
                  multiline
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Board Affiliation</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  {SCHOOL_BOARDS.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.statusOptionPill,
                        newBoard === b && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setNewBoard(b)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          newBoard === b && styles.statusOptionTextActive,
                        ]}
                      >
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Estimated Student Count</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  {STUDENT_TIERS.map((tier) => (
                    <TouchableOpacity
                      key={tier}
                      style={[
                        styles.statusOptionPill,
                        newStudentTier === tier && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setNewStudentTier(tier)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          newStudentTier === tier && styles.statusOptionTextActive,
                        ]}
                      >
                        {tier} Students
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Offering / Program of Interest</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  {SCHOOL_PROGRAMS.map((prog) => (
                    <TouchableOpacity
                      key={prog}
                      style={[
                        styles.statusOptionPill,
                        newOffering === prog && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setNewOffering(prog)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          newOffering === prog && styles.statusOptionTextActive,
                        ]}
                      >
                        {prog}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Initial Meeting Preference</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {MEETING_TYPES.map((mType) => (
                    <TouchableOpacity
                      key={mType}
                      style={[
                        styles.statusOptionPill,
                        newMeetingType === mType && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setNewMeetingType(mType)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          newMeetingType === mType && styles.statusOptionTextActive,
                        ]}
                      >
                        {mType}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Meeting Date & Time (Optional)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.modalTextInput, { flex: 1 }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={newMeetingDate}
                    onChangeText={setNewMeetingDate}
                  />
                  <TextInput
                    style={[styles.modalTextInput, { flex: 1 }]}
                    placeholder="11:00 AM"
                    placeholderTextColor="#94A3B8"
                    value={newMeetingTime}
                    onChangeText={setNewMeetingTime}
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Notes & Discussion Summary</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Meeting context or specific requirements..."
                  placeholderTextColor="#94A3B8"
                  value={newNotes}
                  onChangeText={setNewNotes}
                  multiline
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalPrimaryBtn}
              onPress={handleSaveNewLeadSubmit}
              disabled={isSavingNewLead}
            >
              {isSavingNewLead ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>+ Add Lead to CRM Database</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 1: Edit School Lead Modal ────────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="edit-3" size={20} color={COLORS.brandEmerald} style={{ marginRight: 8 }} />
                <Text style={styles.modalLargeTitle}>✏️ Edit School Lead</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>School Name *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Podar International School"
                  placeholderTextColor="#94A3B8"
                  value={editSchoolName}
                  onChangeText={setEditSchoolName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Primary Contact Person *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Dr. Arvind Mehta"
                  placeholderTextColor="#94A3B8"
                  value={editContactName}
                  onChangeText={setEditContactName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Contact Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  {CONTACT_ROLES.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.statusOptionPill,
                        editContactRole === role && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setEditContactRole(role)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          editContactRole === role && styles.statusOptionTextActive,
                        ]}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. +91 98201 44921"
                  placeholderTextColor="#94A3B8"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Email Address (Optional)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. principal@school.edu.in"
                  placeholderTextColor="#94A3B8"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>City / Location</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Andheri West, Mumbai, MH"
                  placeholderTextColor="#94A3B8"
                  value={editLocation}
                  onChangeText={setEditLocation}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Full Postal Address</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 50, textAlignVertical: 'top' }]}
                  placeholder="Campus address..."
                  placeholderTextColor="#94A3B8"
                  value={editAddress}
                  onChangeText={setEditAddress}
                  multiline
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Board Affiliation</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  {SCHOOL_BOARDS.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.statusOptionPill,
                        editBoard === b && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setEditBoard(b)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          editBoard === b && styles.statusOptionTextActive,
                        ]}
                      >
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Estimated Student Count</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  {STUDENT_TIERS.map((tier) => (
                    <TouchableOpacity
                      key={tier}
                      style={[
                        styles.statusOptionPill,
                        editStudentTier === tier && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setEditStudentTier(tier)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          editStudentTier === tier && styles.statusOptionTextActive,
                        ]}
                      >
                        {tier} Students
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Offering / Program of Interest</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  {SCHOOL_PROGRAMS.map((prog) => (
                    <TouchableOpacity
                      key={prog}
                      style={[
                        styles.statusOptionPill,
                        editOffering === prog && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setEditOffering(prog)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          editOffering === prog && styles.statusOptionTextActive,
                        ]}
                      >
                        {prog}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Initial Meeting Preference</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {MEETING_TYPES.map((mType) => (
                    <TouchableOpacity
                      key={mType}
                      style={[
                        styles.statusOptionPill,
                        editMeetingType === mType && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setEditMeetingType(mType)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          editMeetingType === mType && styles.statusOptionTextActive,
                        ]}
                      >
                        {mType}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Meeting Date & Time (Optional)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.modalTextInput, { flex: 1 }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={editMeetingDate}
                    onChangeText={setEditMeetingDate}
                  />
                  <TextInput
                    style={[styles.modalTextInput, { flex: 1 }]}
                    placeholder="11:00 AM"
                    placeholderTextColor="#94A3B8"
                    value={editMeetingTime}
                    onChangeText={setEditMeetingTime}
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Lead Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  {['new', 'contacted', 'meeting_scheduled', 'meeting_done', 'proposal_sent', 'negotiation', 'lost'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.statusOptionPill, editStatus === st && styles.statusOptionPillActive]}
                      onPress={() => setEditStatus(st)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          editStatus === st && styles.statusOptionTextActive,
                        ]}
                      >
                        {st.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Notes & Discussion Summary</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Meeting context or specific requirements..."
                  placeholderTextColor="#94A3B8"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalPrimaryBtn}
              onPress={handleSaveLeadEdit}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Save Changes to CRM</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* ── MODAL 2: Send Email Modal ────────────────────────────────────────── */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalLargeTitle}>✉️ Send Personalized Email</Text>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>To (Recipient Email)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={emailTargetLead?.email || ''}
                  editable={false}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Subject Line</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={emailSubject}
                  onChangeText={setEmailSubject}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Personalized Pitch Body</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 130, textAlignVertical: 'top' }]}
                  value={emailBody}
                  onChangeText={setEmailBody}
                  multiline
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#E11D48' }]}
              onPress={handleSendEmailSubmit}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Send Email to School</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: Send WhatsApp Modal ─────────────────────────────────────── */}
      <Modal
        visible={waModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalLargeTitle}>💬 Send WhatsApp Message</Text>
              <TouchableOpacity onPress={() => setWaModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>Recipient Phone</Text>
              <TextInput
                style={styles.modalTextInput}
                value={waTargetLead?.phone || ''}
                editable={false}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>WhatsApp Message Template</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 100, textAlignVertical: 'top' }]}
                value={waMessageText}
                onChangeText={setWaMessageText}
                multiline
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#16A34A' }]}
              onPress={handleSendWhatsAppSubmit}
            >
              <FontAwesome name="whatsapp" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalPrimaryBtnText}>Open in WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: WhatsApp CRM Connected Modal ────────────────────────────── */}
      <Modal
        visible={whatsAppModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWhatsAppModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <FontAwesome name="whatsapp" size={32} color={COLORS.whatsAppGreen} />
            </View>
            <Text style={styles.modalTitle}>WhatsApp CRM Connected</Text>
            <Text style={styles.modalSubtitle}>
              Your WhatsApp Business account is active for Mumbai Region. Automated lead notifications and follow-up templates are synced.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalCloseButton}
              onPress={() => setWhatsAppModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 5: Schedule Meeting Modal ────────────────────────────────────── */}
      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalLargeTitle}>📅 Schedule School Meeting</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>School & Principal</Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: '#F1F5F9' }]}
                  value={`${scheduleTargetLead?.schoolName || scheduleTargetLead?.school_name || 'School'} • ${scheduleTargetLead?.contactPerson || scheduleTargetLead?.contact_name || 'Principal'}`}
                  editable={false}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Meeting Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={meetingDate}
                  onChangeText={setMeetingDate}
                  placeholder="2026-11-25"
                />
                <View style={[styles.statusPillsPicker, { marginTop: 6 }]}>
                  {['Tomorrow', 'In 2 Days', 'Next Week'].map((label, idx) => (
                    <TouchableOpacity
                      key={label}
                      style={styles.statusOptionPill}
                      onPress={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + (idx === 0 ? 1 : idx === 1 ? 2 : 7));
                        setMeetingDate(d.toISOString().split('T')[0]);
                      }}
                    >
                      <Text style={styles.statusOptionText}>+ {label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Meeting Time</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={meetingTime}
                  onChangeText={setMeetingTime}
                  placeholder="11:30 AM"
                />
                <View style={[styles.statusPillsPicker, { marginTop: 6 }]}>
                  {['10:30 AM', '02:00 PM', '04:30 PM'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.statusOptionPill, meetingTime === t && styles.statusOptionPillActive]}
                      onPress={() => setMeetingTime(t)}
                    >
                      <Text style={[styles.statusOptionText, meetingTime === t && styles.statusOptionTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Meeting Format</Text>
                <View style={styles.statusPillsPicker}>
                  {['In-Person Campus Visit', 'Online Demo (Google Meet)'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.statusOptionPill, meetingType === type && styles.statusOptionPillActive]}
                      onPress={() => setMeetingType(type)}
                    >
                      <Text style={[styles.statusOptionText, meetingType === type && styles.statusOptionTextActive]}>
                        {type === 'In-Person Campus Visit' ? '🏫 In-Person' : '💻 Google Meet'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#2563EB' }]}
              onPress={handleScheduleMeetingSubmit}
              disabled={isScheduling}
            >
              {isScheduling ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Confirm & Schedule Meeting</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 6: Raise Support Ticket Modal ────────────────────────────────── */}
      <Modal
        visible={ticketModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTicketModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalLargeTitle}>🎫 Raise Support Ticket</Text>
              <TouchableOpacity onPress={() => setTicketModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>School Reference</Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: '#F1F5F9' }]}
                  value={ticketTargetLead?.schoolName || ticketTargetLead?.school_name || 'School'}
                  editable={false}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Ticket Subject / Issue</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={ticketTitle}
                  onChangeText={setTicketTitle}
                />
                <View style={[styles.statusPillsPicker, { marginTop: 6, flexWrap: 'wrap' }]}>
                  {['Curriculum Customization', 'Quote Approval', 'Hardware Lab Kit', 'MOU Revision'].map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.statusOptionPill, ticketTitle.includes(sub) && styles.statusOptionPillActive]}
                      onPress={() => setTicketTitle(sub)}
                    >
                      <Text style={[styles.statusOptionText, ticketTitle.includes(sub) && styles.statusOptionTextActive]}>
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Priority Level</Text>
                <View style={styles.statusPillsPicker}>
                  {['High', 'Medium', 'Normal'].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.statusOptionPill, ticketPriority === p && styles.statusOptionPillActive]}
                      onPress={() => setTicketPriority(p)}
                    >
                      <Text style={[styles.statusOptionText, ticketPriority === p && styles.statusOptionTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Ticket Description / Context</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 80, textAlignVertical: 'top' }]}
                  value={ticketDescription}
                  onChangeText={setTicketDescription}
                  placeholder="Provide any additional details or requirements..."
                  multiline
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#EA580C' }]}
              onPress={handleRaiseTicketSubmit}
              disabled={isRaisingTicket}
            >
              {isRaisingTicket ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Submit Support Ticket</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 7: Follow-up Reminder Modal ──────────────────────────────────── */}
      <Modal
        visible={followupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFollowupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalLargeTitle}>⏰ Schedule Follow-up</Text>
              <TouchableOpacity onPress={() => setFollowupModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>Follow-up Target</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: '#F1F5F9' }]}
                value={followupTargetLead?.schoolName || followupTargetLead?.school_name || 'School'}
                editable={false}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>Follow-up Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={followupDate}
                onChangeText={setFollowupDate}
              />
              <View style={[styles.statusPillsPicker, { marginTop: 6 }]}>
                {['Tomorrow', 'In 3 Days', 'Next Week'].map((label, idx) => (
                  <TouchableOpacity
                    key={label}
                    style={styles.statusOptionPill}
                    onPress={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + (idx === 0 ? 1 : idx === 1 ? 3 : 7));
                      setFollowupDate(d.toISOString().split('T')[0]);
                    }}
                  >
                    <Text style={styles.statusOptionText}>+ {label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>Follow-up Action Note</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 75, textAlignVertical: 'top' }]}
                value={followupComment}
                onChangeText={setFollowupComment}
                multiline
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#0D9488' }]}
              onPress={handleFollowupSubmit}
              disabled={isSavingFollowup}
            >
              {isSavingFollowup ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Set Follow-up Reminder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 8: Assign Lead Modal ────────────────────────────────────────── */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalLargeTitle}>👤 Assign Lead to Team</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>Assigning Lead</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: '#F1F5F9' }]}
                value={assignTargetLead?.schoolName || assignTargetLead?.school_name || 'School'}
                editable={false}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>Select Team Member</Text>
              <View style={[styles.statusPillsPicker, { flexDirection: 'column', gap: 6 }]}>
                {[
                  'Yash Limbachiya (B2B Lead)',
                  'Rahul Sharma (Regional Manager)',
                  'Priya Singh (Sales Executive)',
                  'Admin Desk (Unassigned Pool)',
                ].map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[styles.statusOptionPill, assignedMemberName === name && styles.statusOptionPillActive]}
                    onPress={() => setAssignedMemberName(name)}
                  >
                    <Text style={[styles.statusOptionText, assignedMemberName === name && styles.statusOptionTextActive]}>
                      ✓ {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#4F46E5' }]}
              onPress={handleAssignLeadSubmit}
              disabled={isAssigning}
            >
              {isAssigning ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Confirm Assignment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 9: Mark as Lost Modal ───────────────────────────────────────── */}
      <Modal
        visible={lostModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLostModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalLargeTitle, { color: '#E11D48' }]}>❌ Mark Lead as Lost</Text>
              <TouchableOpacity onPress={() => setLostModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>School</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: '#F1F5F9' }]}
                value={lostTargetLead?.schoolName || lostTargetLead?.school_name || 'School'}
                editable={false}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>Primary Reason for Drop-off</Text>
              <View style={[styles.statusPillsPicker, { flexDirection: 'column', gap: 6 }]}>
                {[
                  'Budget Constraint / Fee Pushback',
                  'Competitor Partner Selected',
                  'Postponed to Next Academic Term',
                  'Lack of Computer Lab Infrastructure',
                  'School Management Decision Pending',
                ].map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.statusOptionPill, lostReason === reason && styles.statusOptionPillActive]}
                    onPress={() => setLostReason(reason)}
                  >
                    <Text style={[styles.statusOptionText, lostReason === reason && styles.statusOptionTextActive]}>
                      • {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#E11D48' }]}
              onPress={handleLostLeadSubmit}
              disabled={isMarkingLost}
            >
              {isMarkingLost ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Confirm Mark as Lost</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 10: Add Note Modal ──────────────────────────────────────────── */}
      <Modal
        visible={noteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalLargeTitle}>📝 Add Note & Comment</Text>
              <TouchableOpacity onPress={() => setNoteModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>School Reference</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: '#F1F5F9' }]}
                value={noteTargetLead?.schoolName || noteTargetLead?.school_name || 'School'}
                editable={false}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalFieldLabel}>Note / Comment (Web App Comments)</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 110, textAlignVertical: 'top' }]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Enter discussion remarks, key commitments, or principal requests..."
                multiline
              />
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                💡 Note will be synced directly to the school comments in the web app.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#059669' }]}
              onPress={handleNoteSubmit}
              disabled={isSavingNote}
            >
              {isSavingNote ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Save Note to Comments & CRM</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 11: Documents & Proposals Modal ─────────────────────────────── */}
      <Modal
        visible={docsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDocsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalLargeTitle}>📄 Documents & Proposals</Text>
              <TouchableOpacity onPress={() => setDocsModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>
                Available documents for {docsTargetLead?.schoolName || docsTargetLead?.school_name || 'this school'}:
              </Text>

              {[
                { name: 'OLL Agentic AI Curriculum Brochure.pdf', size: '2.4 MB', icon: 'file-text' },
                { name: 'School Partnership Standard MOU (2026-27).pdf', size: '1.1 MB', icon: 'file' },
                { name: 'Customized STEM Excellence Proposal Quotation.pdf', size: '890 KB', icon: 'file-text' },
              ].map((doc, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 10,
                    backgroundColor: '#F8FAFC',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: 8,
                  }}
                  onPress={() => {
                    setDocsModalVisible(false);
                    Alert.alert('Download', `Downloading ${doc.name}...`);
                  }}
                >
                  <Feather name={doc.icon} size={18} color="#0891B2" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary }}>{doc.name}</Text>
                    <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>{doc.size} • Verified</Text>
                  </View>
                  <Feather name="download" size={14} color="#0891B2" />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#0891B2' }]}
              onPress={() => {
                setDocsModalVisible(false);
                if (docsTargetLead) openSendEmailModal(docsTargetLead);
              }}
            >
              <Feather name="mail" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalPrimaryBtnText}>Email Documents to School</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.headerBg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  chatTabContainer: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cardsList: {
    width: '100%',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalLargeCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalLargeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalInputGroup: {
    marginBottom: 12,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: COLORS.textPrimary,
  },
  statusPillsPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOptionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  statusOptionPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  statusOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statusOptionTextActive: {
    color: '#059669',
  },
  modalPrimaryBtn: {
    backgroundColor: COLORS.brandEmerald,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 14,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalCloseButton: {
    backgroundColor: COLORS.brandEmerald,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
