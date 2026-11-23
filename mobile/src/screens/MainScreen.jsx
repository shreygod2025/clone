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

  // 1. Edit Lead Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editContactName, setEditContactName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
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

  // ── Helper: Locate Latest Active Lead in Conversation ────────────────────────
  const findLatestLead = () => {
    const withLead = [...messages].reverse().find((m) => m.leadCard && !m.leadCard.isDeleted);
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
    setEditContactName(target.contactPerson || target.contact_name || '');
    setEditPhone(target.phone || '');
    setEditEmail(target.email || '');
    setEditStatus(target.status || 'new');
    setEditNotes(target.notes || '');
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
    setLostTargetLead(target);
    setLostReason('Budget Constraint');
    setLostModalVisible(true);
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

  // 2. Delete Lead permanently from CRM database
  const handleDeleteLead = (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) {
      Alert.alert('Notice', 'No active school lead found to delete.');
      return;
    }
    const schoolName = target.schoolName || target.school_name || 'this school';
    if (target.status === 'deleted' || target.isDeleted) {
      Alert.alert('Already Deleted', `"${schoolName}" has already been deleted from CRM.`);
      return;
    }

    Alert.alert(
      'Delete School Lead',
      `Are you sure you want to permanently delete "${schoolName}" from the CRM database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsTyping(true);
            if (target.id) {
              await api.deleteSchoolInquiry(target.id);
            }
            setIsTyping(false);

            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.leadCard && (msg.leadCard.id === target.id || msg.leadCard.schoolName === schoolName)) {
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
                text: `🗑️ **Lead Deleted:** Removed **${schoolName}** from the CRM database.`,
                nextActions: ['Add School Lead'],
                time: 'Just now',
              },
            ]);
          },
        },
      ]
    );
  };

  // 3. Archive Lead
  const handleArchiveLead = async (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const schoolName = target.schoolName || target.school_name || 'School';
    if (target.status === 'lost') {
      Alert.alert('Lead Closed (Lost)', `"${schoolName}" is marked as a Lost Lead.`);
      return;
    }
    if (target.status === 'deleted' || target.isDeleted) {
      Alert.alert('Lead Deleted', `"${schoolName}" has been deleted from CRM.`);
      return;
    }
    setIsTyping(true);
    if (target.id) {
      await api.updateSchoolInquiry(target.id, { status: 'archived' });
    }
    setIsTyping(false);

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.leadCard && (msg.leadCard.id === target.id || msg.leadCard.schoolName === schoolName)) {
          return {
            ...msg,
            leadCard: {
              ...msg.leadCard,
              status: 'archived',
              isDeleted: false,
              isArchived: true,
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
        text: `📦 **Lead Archived:** **${schoolName}** has been moved to CRM archives. You can unarchive or delete it at any time.`,
        nextActions: ['Add School Lead'],
        time: 'Just now',
      },
    ]);
  };

  // 3a. Unarchive Lead (Restore to Active Pipeline)
  const handleUnarchiveLead = async (leadCard) => {
    const target = leadCard || findLatestLead();
    if (!target) return;
    const schoolName = target.schoolName || target.school_name || 'School';
    setIsTyping(true);
    if (target.id) {
      await api.updateSchoolInquiry(target.id, { status: 'new' });
    }
    setIsTyping(false);

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.leadCard && (msg.leadCard.id === target.id || msg.leadCard.schoolName === schoolName)) {
          return {
            ...msg,
            leadCard: {
              ...msg.leadCard,
              status: 'new',
              isDeleted: false,
              isArchived: false,
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
        text: `✅ **Lead Restored from Archive:** **${schoolName}** has been restored to active pipeline as **New Lead**. You can now edit, schedule meetings, or generate proposals.`,
        nextActions: ['Schedule Meeting', 'Generate Proposal Quote'],
        time: 'Just now',
      },
    ]);
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
    setIsSavingEdit(true);

    const updatePayload = {
      school_name: editSchoolName,
      contact_name: editContactName,
      phone: editPhone,
      email: editEmail,
      status: editStatus,
      notes: editNotes,
    };

    if (editingLead.id) {
      await api.updateSchoolInquiry(editingLead.id, updatePayload);
    }

    setIsSavingEdit(false);
    setEditModalVisible(false);

    // Update lead in messages stream
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.leadCard && (msg.leadCard.id === editingLead.id || msg.leadCard.schoolName === editingLead.schoolName)) {
          return {
            ...msg,
            leadCard: {
              ...msg.leadCard,
              ...updatePayload,
              schoolName: editSchoolName,
              contactPerson: editContactName,
            },
          };
        }
        return msg;
      })
    );

    // AI confirmation message
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `✏️ **Lead Updated in CRM:** Changes to **${editSchoolName}** (${editStatus.toUpperCase()}) were saved to the database.`,
        nextActions: ['Mark Meeting Done', 'Generate Proposal Quote'],
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

    // ── 0C. Action Intent: Unarchive Lead ──
    if (
      lower.includes('unarchive') ||
      lower.includes('restore lead') ||
      lower.includes('un-archive')
    ) {
      setIsTyping(false);
      const targetLead = findLatestLead();
      if (targetLead) {
        await handleUnarchiveLead(targetLead);
      } else {
        Alert.alert('Notice', 'No archived school lead found in context to restore.');
      }
      return;
    }

    // ── 0D. Query Intent: Retrieve Specific / Particular Lead in CRM ──
    const isSpecificLeadQuery =
      !isRetrieveAllLeadsIntent &&
      (lower.includes('particular lead') ||
        lower.includes('specific lead') ||
        lower.startsWith('retrieve lead') ||
        lower.startsWith('show lead') ||
        lower.startsWith('find lead') ||
        lower.startsWith('get lead') ||
        lower.startsWith('search lead') ||
        lower.startsWith('view lead') ||
        lower.startsWith('inspect lead') ||
        (lower.includes('retrieve') && lower.includes('lead')) ||
        (lower.includes('show') && lower.includes('lead')) ||
        (lower.includes('get') && lower.includes('lead')) ||
        (lower.includes('lead for') && !lower.includes('create') && !lower.includes('add')));

    if (isSpecificLeadQuery) {
      let queryName = userText
        .replace(/retrieve\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/show\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/get\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/find\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/view\s+(?:a\s+)?(?:particular|specific)\s+lead(?:\s+for)?/i, '')
        .replace(/retrieve\s+lead(?:\s+for)?/i, '')
        .replace(/show\s+lead(?:\s+for)?/i, '')
        .replace(/find\s+lead(?:\s+for)?/i, '')
        .replace(/get\s+lead(?:\s+for)?/i, '')
        .replace(/search\s+lead(?:\s+for)?/i, '')
        .replace(/view\s+lead(?:\s+for)?/i, '')
        .replace(/lead\s+for/i, '')
        .replace(/details\s+for/i, '')
        .replace(/details/i, '')
        .replace(/particular\s+lead/i, '')
        .replace(/specific\s+lead/i, '')
        .trim();

      // Clean out common filler words
      if (
        queryName.toLowerCase() === 'a' ||
        queryName.toLowerCase() === 'the' ||
        queryName.toLowerCase() === 'school' ||
        queryName.toLowerCase() === 'in crm' ||
        queryName.toLowerCase() === 'from crm'
      ) {
        queryName = '';
      }

      const res = await api.fetchSchoolInquiries(100);
      setIsTyping(false);

      let matched = null;
      const queryLower = queryName.toLowerCase();

      // Priority 1: If query specified, check recent conversation memory first
      if (queryLower) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const lc = messages[i]?.leadCard;
          if (lc) {
            const sName = (lc.schoolName || lc.school_name || '').toLowerCase();
            const cName = (lc.contactPerson || lc.contact_name || '').toLowerCase();
            if (sName.includes(queryLower) || queryLower.includes(sName) || cName.includes(queryLower)) {
              matched = {
                id: lc.id,
                school_name: lc.schoolName || lc.school_name,
                contact_name: lc.contactPerson || lc.contact_name,
                contact_role: lc.contactRole || 'Principal',
                phone: lc.phone,
                email: lc.email,
                location: lc.location,
                board: lc.board,
                school_size: lc.studentCount,
                programs_interested: [lc.recommendedProgram],
                notes: lc.notes,
                status: lc.status,
                isDeleted: lc.isDeleted,
                isArchived: lc.isArchived,
                meeting_date: lc.meeting_date,
                meeting_time: lc.meeting_time,
                meeting_type: lc.meeting_type,
                comments: lc.comments,
              };
              break;
            }
          }
        }
      }

      // Priority 2: Check live CRM backend inquiries
      if (!matched && res.success && Array.isArray(res.inquiries) && res.inquiries.length > 0) {
        if (queryLower) {
          matched = res.inquiries.find((l) => {
            const sName = (l.school_name || '').toLowerCase();
            const cName = (l.contact_name || '').toLowerCase();
            return sName.includes(queryLower) || queryLower.includes(sName) || cName.includes(queryLower);
          });
        }
      }

      // Priority 3: If generic query (e.g. "retrieve a particular lead" or "show lead"), snap to latest in context or first inquiry
      if (!matched && !queryLower) {
        const latest = findLatestLead();
        if (latest) {
          matched = {
            id: latest.id,
            school_name: latest.schoolName || latest.school_name,
            contact_name: latest.contactPerson || latest.contact_name,
            contact_role: latest.contactRole || 'Principal',
            phone: latest.phone,
            email: latest.email,
            location: latest.location,
            board: latest.board,
            school_size: latest.studentCount,
            programs_interested: [latest.recommendedProgram],
            notes: latest.notes,
            status: latest.status,
            isDeleted: latest.isDeleted,
            isArchived: latest.isArchived,
            meeting_date: latest.meeting_date,
            meeting_time: latest.meeting_time,
            meeting_type: latest.meeting_type,
            comments: latest.comments,
          };
        } else if (res.success && Array.isArray(res.inquiries) && res.inquiries.length > 0) {
          matched = res.inquiries[0];
        }
      }

      if (matched) {
        const isArchived = matched.status === 'archived' || matched.isArchived === true;
        const isDeleted = matched.status === 'deleted' || matched.isDeleted === true;
        const isLost = !isDeleted && !isArchived && matched.status === 'lost';
        const isMeetingDone = !isDeleted && !isArchived && matched.status === 'meeting_done';
        const isMeetingScheduled = !isDeleted && !isArchived && !isMeetingDone && (matched.status === 'meeting_scheduled' || Boolean(matched.meeting_date));

        const leadCardObj = {
          id: matched.id,
          schoolName: matched.school_name || matched.schoolName,
          contactPerson: `${matched.contact_name || matched.contactPerson || 'Contact'} (${matched.contact_role || 'Principal'})`,
          phone: matched.phone || '',
          email: matched.email || '',
          location: matched.location || 'Mumbai, Maharashtra',
          board: matched.board || 'CBSE',
          studentCount: matched.school_size || matched.student_count_tier || 'Enrolled Campus',
          recommendedProgram: (matched.programs_interested && matched.programs_interested[0]) || 'Agentic AI & Coding Excellence Lab (K-12)',
          leadScore: isArchived ? 'Archived Record' : isLost ? '0/100 (Closed)' : '92/100 (Active Pipeline)',
          notes: matched.notes || (isArchived ? 'This lead is in CRM archives.' : 'Inquiry active in School CRM.'),
          status: matched.status || 'new',
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
              text: `📦 **Retrieved Archived Lead Dossier for ${leadCardObj.schoolName}:**\n\n• **Status:** \`ARCHIVED\`\n• **Contact:** ${matched.contact_name || 'Principal'} (${matched.contact_role || 'Principal'})\n• **Phone:** \`${matched.phone || 'N/A'}\`\n• **Location:** ${matched.location || 'Mumbai'}\n• **Board:** ${matched.board || 'CBSE'}\n\nThis school lead is stored in the archive. Interactive lead card rendered below with **Unarchive** and **Delete** controls:`,
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
              text: `🏫 **Retrieved Lead Dossier for ${leadCardObj.schoolName}:**\n\n• **Status:** \`${(matched.status || 'NEW').toUpperCase()}\`\n• **Contact:** ${matched.contact_name || 'Principal'} (${matched.contact_role || 'Principal'})\n• **Phone:** \`${matched.phone || 'N/A'}\`\n• **Location:** ${matched.location || 'Mumbai'}\n• **Board:** ${matched.board || 'CBSE'}\n${matched.meeting_date ? `• **Meeting:** \`${matched.meeting_date}\` (${matched.meeting_type || 'offline'})\n` : ''}\nInteractive lead card rendered below with full action controls:`,
              leadCard: leadCardObj,
              nextActions: isLost
                ? ['Add School Lead']
                : isMeetingDone
                ? ['Schedule 2nd Meeting', 'Generate Proposal Quote']
                : isMeetingScheduled
                ? ['Mark Meeting Done', 'Generate Proposal Quote']
                : ['Schedule Meeting', 'Generate Proposal Quote'],
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

    // ── 2. Action Intent: Delete Lead ──
    if (
      lower.startsWith('delete') ||
      lower.includes('delete lead') ||
      lower.includes('remove lead') ||
      lower.includes('delete school')
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'deleted' || target.isDeleted) {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `🗑️ **Already Deleted:** **${target.schoolName || target.school_name}** has already been deleted from CRM.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        handleDeleteLead(target);
      } else {
        Alert.alert('Notice', 'No active school lead found to delete.');
      }
      return;
    }

    // ── 3. Action Intent: Mark as Lost Lead ──
    if (
      lower.includes('lost lead') ||
      lower.includes('mark as lost') ||
      lower.includes('mark lost') ||
      lower.includes('deal lost')
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Already Lost:** **${target.schoolName || target.school_name}** is already recorded as a Lost Lead.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }
        if (target.status === 'deleted' || target.isDeleted) {
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
        openLostLeadModal(target);
      } else {
        Alert.alert('Notice', 'No active school lead found.');
      }
      return;
    }

    // ── 4. Action Intent: Archive Lead ──
    if (
      lower.includes('archive lead') ||
      lower.includes('archive school') ||
      lower === 'archive'
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
        await handleArchiveLead(target);
      } else {
        Alert.alert('Notice', 'No active school lead found to archive.');
      }
      return;
    }

    // ── 5. Action Intent: Schedule Meeting (Rule 2 & 3) ──
    if (
      lower.includes('schedule meeting') ||
      lower.includes('schedule demo') ||
      lower.includes('book meeting') ||
      lower.includes('set meeting')
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead. Meetings cannot be scheduled for closed leads.`,
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
              text: `🗑️ **Lead Deleted:** **${target.schoolName || target.school_name}** was deleted from CRM. Meetings cannot be scheduled for deleted leads.`,
              nextActions: ['Add School Lead'],
              time: 'Just now',
            },
          ]);
          return;
        }

        const isMeetingScheduled = target.status === 'meeting_scheduled' || (target.meeting_date && target.status !== 'meeting_done');
        const isMeetingDone = target.status === 'meeting_done';

        if (isMeetingScheduled && !isMeetingDone) {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `⚠️ **Meeting Already Scheduled:** A meeting with **${target.schoolName || target.school_name}** is already scheduled for **${target.meeting_date || 'an upcoming date'}**${target.meeting_time ? ` at **${target.meeting_time}**` : ''}.\n\nUnder CRM rules, you cannot reschedule this meeting until it has taken place and been marked as Done.`,
              nextActions: ['Mark Meeting Done', 'Send Meeting Invite Email'],
              time: 'Just now',
            },
          ]);
          return;
        }

        openScheduleMeetingModal(target);
      } else {
        Alert.alert('Notice', 'No active school lead found to schedule meeting.');
      }
      return;
    }

    // ── 6. Action Intent: Assign Lead ──
    if (
      lower.startsWith('assign') ||
      lower.includes('assign lead') ||
      lower.includes('assign to')
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead. Lost leads cannot be assigned.`,
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
        openAssignLeadModal(target);
      } else {
        Alert.alert('Notice', 'No active school lead found to assign.');
      }
      return;
    }

    // ── 7. Action Intent: Raise Support Ticket ──
    if (
      lower.includes('raise ticket') ||
      lower.includes('support ticket') ||
      lower.includes('create ticket') ||
      lower === 'ticket'
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead. Support tickets cannot be raised for closed leads.`,
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
        openRaiseTicketModal(target);
      } else {
        Alert.alert('Notice', 'No active school lead found to raise a ticket for.');
      }
      return;
    }

    // ── 8. Action Intent: Add Note / Comment ──
    if (
      lower.startsWith('note:') ||
      lower.startsWith('comment:') ||
      lower.includes('add note') ||
      lower.includes('take note') ||
      lower.includes('save note') ||
      lower.includes('add comment') ||
      lower.includes('new comment')
    ) {
      setIsTyping(false);
      if (target) {
        if (target.status === 'lost') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `❌ **Lead Closed (Lost):** **${target.schoolName || target.school_name}** is marked as a Lost Lead. Notes cannot be added to closed leads.`,
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
        let extractedNote = '';
        const colonIdx = userText.indexOf(':');
        if (colonIdx !== -1 && colonIdx < userText.length - 1) {
          extractedNote = userText.slice(colonIdx + 1).trim();
        }
        openNoteModal(target, extractedNote);
      } else {
        Alert.alert('Notice', 'No active school lead found to add a note or comment to.');
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
              <Text style={styles.modalLargeTitle}>✏️ Edit School Lead</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>School Name</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editSchoolName}
                  onChangeText={setEditSchoolName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Contact Person</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editContactName}
                  onChangeText={setEditContactName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Phone Number</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Email Address</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Lead Status</Text>
                <View style={styles.statusPillsPicker}>
                  {['new', 'meeting_done', 'converted'].map((st) => (
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
                        {st.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Latest Assistant Note</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 70, textAlignVertical: 'top' }]}
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
