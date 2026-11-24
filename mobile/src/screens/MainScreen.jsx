import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
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
import { SafeAreaView } from 'react-native-safe-area-context';
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
import FieldVisitScreen from './FieldVisitScreen';
import TasksScreen from './TasksScreen';
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

function AccessDeniedView({ moduleName, onBackToChat }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Feather name="lock" size={32} color="#EF4444" />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
        Access Denied
      </Text>
      <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 300 }}>
        You do not have permission to access {moduleName}. Please contact your administrator.
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        style={{
          backgroundColor: '#059669',
          paddingHorizontal: 22,
          paddingVertical: 11,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
        onPress={onBackToChat}
      >
        <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Back to AI Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

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
    if (!Keyboard || typeof Keyboard.addListener !== 'function') return;

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
      showSub?.remove?.();
      hideSub?.remove?.();
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
  const [teamUsers, setTeamUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(user || null);
  const [assignableUsers, setAssignableUsers] = useState([]);

  useEffect(() => {
    if (typeof api?.getMe === 'function') {
      api.getMe().then((res) => {
        if (res?.success && res.user) {
          setCurrentUser(res.user);
        }
      }).catch(() => {});
    }

    if (typeof api?.fetchAssignableUsers === 'function') {
      api.fetchAssignableUsers().then((res) => {
        if (res?.success && Array.isArray(res.users)) {
          setAssignableUsers(res.users);
        }
      }).catch(() => {});
    }

    if (typeof api?.fetchTeamUsers === 'function') {
      api.fetchTeamUsers().then((res) => {
        if (res?.success && Array.isArray(res.users)) {
          setTeamUsers(res.users);
        }
      }).catch(() => {});
    }
  }, []);

  const effectiveUser = currentUser || user;
  const userRole = effectiveUser?.role;
  const userPerms = Array.isArray(effectiveUser?.permissions) ? effectiveUser.permissions : [];
  const isUserAdmin = userRole === 'admin' || userRole === 'super_admin';
  const canAccessFieldVisit = isUserAdmin || userPerms.includes('field_reports') || userPerms.includes('field_visit') || userPerms.includes('field_reports_admin');
  const canAccessSchoolCrm = isUserAdmin || userPerms.includes('schools');

  const currentUserId = effectiveUser?.id || effectiveUser?.user_id || '';
  const currentUserName = effectiveUser?.name || effectiveUser?.email || 'Myself';

  // Subordinates calculation
  const managedUsers = (assignableUsers || []).filter(
    (u) => !u.is_self && u.id !== currentUserId
  );
  const managedUserIds = managedUsers.map((u) => u.id);
  const canAssignToOthers = isUserAdmin || managedUsers.length > 0;

  // Determine whether current user can edit/delete a particular task
  const canEditTask = (task) => {
    if (!task) return false;
    if (isUserAdmin) return true;

    const taskAssigner = task.assigned_by || task.creator_id || task.created_by;
    const taskAssignee = task.assigned_to;

    const isAssignedByMe = Boolean(currentUserId && taskAssigner && taskAssigner === currentUserId);
    const isAssignedToMe = Boolean(currentUserId && taskAssignee && taskAssignee === currentUserId);

    // If task is assigned to me: strictly require that it was assigned by me to myself
    if (isAssignedToMe) {
      return isAssignedByMe;
    }

    // If task is assigned to another person: require that it was assigned by me and the person is in managed subordinates
    if (isAssignedByMe && Array.isArray(managedUserIds) && managedUserIds.includes(taskAssignee)) {
      return true;
    }

    return false;
  };

  const getTaskActionChips = () => {
    return ['Create Task'];
  };

  // 11b. Edit Task Modal State
  const [editTaskModalVisible, setEditTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState('medium');
  const [editTaskStatus, setEditTaskStatus] = useState('pending');
  const [editTaskAssignee, setEditTaskAssignee] = useState('');
  const [isSavingEditTask, setIsSavingEditTask] = useState(false);

  const openEditTaskModal = (task) => {
    if (!task) return;
    if (!canEditTask(task)) {
      Alert.alert('Access Denied', 'You do not have permission to edit this task.');
      return;
    }
    setEditingTask(task);
    setEditTaskTitle(task.title || '');
    setEditTaskDescription(task.description || '');
    setEditTaskDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setEditTaskPriority(task.priority || 'medium');
    setEditTaskStatus(task.status || 'pending');
    setEditTaskAssignee(task.assigned_to || '');
    setEditTaskModalVisible(true);
  };

  const handleSaveEditTaskSubmit = () => {
    if (!editingTask) return;
    if (!editTaskTitle.trim()) {
      Alert.alert('Required', 'Task title cannot be blank.');
      return;
    }

    // Confirmation dialog before saving task updates
    Alert.alert(
      'Are you sure you want to update this task?',
      `• Title: ${editTaskTitle.trim()}\n• Description: ${editTaskDescription.trim() || 'None'}\n• Priority: ${editTaskPriority.toUpperCase()}\n• Deadline: ${editTaskDueDate || 'None'}\n• Status: ${editTaskStatus}`,
      [
        { text: 'Cancel – Return to Editing', style: 'cancel' },
        {
          text: 'Confirm – Update Task',
          onPress: async () => {
            setIsSavingEditTask(true);
            const updatePayload = {
              title: editTaskTitle.trim(),
              description: editTaskDescription.trim(),
              due_date: editTaskDueDate || null,
              priority: editTaskPriority,
              status: editTaskStatus,
              assigned_to: canAssignToOthers ? (editTaskAssignee || editingTask.assigned_to) : editingTask.assigned_to,
            };
            const res = await api.updateTask(editingTask.id, updatePayload);
            setIsSavingEditTask(false);

            if (res.success && res.task) {
              setEditTaskModalVisible(false);
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.taskCard && m.taskCard.id === editingTask.id) {
                    return { ...m, taskCard: res.task };
                  }
                  if (m.taskListCard && Array.isArray(m.taskListCard.tasks)) {
                    return {
                      ...m,
                      taskListCard: {
                        ...m.taskListCard,
                        tasks: m.taskListCard.tasks.map((t) => (t.id === editingTask.id ? res.task : t)),
                      },
                    };
                  }
                  return m;
                })
              );
              Alert.alert('Updated', 'Task updated successfully.');
            } else {
              if (res.status === 403 || (res.error && res.error.toLowerCase().includes('access denied'))) {
                Alert.alert('Access Denied', 'Access denied.');
              } else {
                Alert.alert('Error', res.error || 'Failed to update task.');
              }
            }
          },
        },
      ]
    );
  };

  // 12. View Comments & Activity History Modal State (Web App CRM View)
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewTargetLead, setViewTargetLead] = useState(null);
  const [viewCommentsList, setViewCommentsList] = useState([]);
  const [viewHistoryList, setViewHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [newViewComment, setNewViewComment] = useState('');
  const [isAddingViewComment, setIsAddingViewComment] = useState(false);
  const [viewHistoryCollapsed, setViewHistoryCollapsed] = useState(false);

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
    if (!isUserAdmin) {
      Alert.alert('Access Denied', 'Access denied.');
      return;
    }
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

  // 12. Open View Comments, Notes & Activity History Modal (Web App CRM View)
  const openViewLeadModal = async (leadCard) => {
    const target = leadCard || findLatestLeadIncludingArchived();
    if (!target) {
      Alert.alert('Notice', 'No school lead available to view.');
      return;
    }

    setViewTargetLead(target);
    setViewCommentsList(target.comments || []);
    setNewViewComment('');
    setViewModalVisible(true);
    setIsLoadingHistory(true);

    try {
      if (target.id) {
        // Fetch real-time comments from CRM backend
        api.getSchoolComments(target.id).then((commentsRes) => {
          if (commentsRes.success && Array.isArray(commentsRes.comments) && commentsRes.comments.length > 0) {
            setViewCommentsList(commentsRes.comments);
          }
        }).catch(() => {});

        // Fetch activity history from CRM backend
        const histRes = await api.getSchoolHistory(target.id);
        if (histRes.success && Array.isArray(histRes.history) && histRes.history.length > 0) {
          setViewHistoryList(histRes.history);
          setIsLoadingHistory(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error fetching history:', e);
    }

    // Synthesize history timeline if backend history list is empty
    const synthesized = [];
    if (target.comments && target.comments.length > 0) {
      target.comments.forEach((c) => {
        synthesized.push({
          type: 'note',
          date: c.created_at || new Date().toISOString(),
          description: `Comment: "${c.text}"`,
          user: c.author || 'CRM Assistant',
        });
      });
    }
    if (target.meeting_date) {
      synthesized.push({
        type: 'meeting_scheduled',
        date: target.meeting_date,
        description: `Meeting scheduled for ${target.meeting_date} at ${target.meeting_time || '11:00 AM'} (${target.meeting_type || 'offline'})`,
        user: user?.name || 'CRM Team',
      });
    }
    if (target.status === 'meeting_done') {
      synthesized.push({
        type: 'status_change',
        date: new Date().toISOString(),
        description: 'Meeting marked as completed (Done). Ready for 2nd round or proposal.',
        user: user?.name || 'CRM Team',
      });
    }
    if (target.status === 'lost') {
      synthesized.push({
        type: 'status_change',
        date: new Date().toISOString(),
        description: `Marked as Lost Lead: ${target.lost_reason || 'Pipeline closed'}`,
        user: user?.name || 'CRM Team',
      });
    }
    if (target.status === 'archived') {
      synthesized.push({
        type: 'status_change',
        date: new Date().toISOString(),
        description: 'Lead stored in CRM archives.',
        user: user?.name || 'CRM Team',
      });
    }
    synthesized.push({
      type: 'created',
      date: target.created_at || new Date().toISOString(),
      description: `Inquiry registered in CRM database for ${target.schoolName || target.school_name || 'School'}`,
      user: target.contactPerson || 'School Desk',
    });

    setViewHistoryList(synthesized);
    setIsLoadingHistory(false);
  };

  // Helper to format activity dates and badges for View Dossier Modal
  const formatActivityDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      return dt.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(d);
    }
  };

  const getActivityTypeMeta = (type) => {
    switch (type) {
      case 'created':
        return { label: 'Inquiry Created', color: '#2563EB', bg: '#EFF6FF', border: '#60A5FA', icon: 'plus-circle' };
      case 'status_change':
        return { label: 'Status Changed', color: '#D97706', bg: '#FFFBEB', border: '#FBBF24', icon: 'refresh-cw' };
      case 'meeting_scheduled':
        return { label: 'Meeting Scheduled', color: '#7C3AED', bg: '#F5F3FF', border: '#A78BFA', icon: 'calendar' };
      case 'followup':
        return { label: 'Follow-up Set', color: '#EA580C', bg: '#FFF7ED', border: '#FB923C', icon: 'clock' };
      case 'converted':
        return { label: 'Partnered / Won', color: '#059669', bg: '#ECFDF5', border: '#34D399', icon: 'check-circle' };
      case 'onboarding_step':
        return { label: 'Onboarding Step', color: '#0D9488', bg: '#F0FDFA', border: '#2DD4BF', icon: 'layers' };
      case 'ticket':
        return { label: 'Ticket Raised', color: '#DC2626', bg: '#FEF2F2', border: '#F87171', icon: 'alert-circle' };
      case 'note':
        return { label: 'Note / Comment', color: '#475569', bg: '#F8FAFC', border: '#94A3B8', icon: 'message-square' };
      default:
        return { label: 'CRM Activity', color: '#4F46E5', bg: '#EEF2FF', border: '#818CF8', icon: 'activity' };
    }
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

    const userUid = user?.id || user?.user_id || '';
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const isOwner = !lead.assigned_to || lead.assigned_to === userUid || lead.added_by === userUid;

    if (!isAdmin && !isOwner) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `⛔ **Access Denied:** You don't have access to it. Only the lead owner or an administrator can delete leads from the CRM database.`,
          nextActions: ['Add School Lead'],
          time: 'Just now',
        },
      ]);
      return;
    }
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

  // ── Mission Control Task Helpers & Actions (Integrated in AI Chat) ──────────
  const extractTaskDetailsFromText = (text, defaultAssignee = '') => {
    let clean = text
      .replace(/^create\s+(?:a\s+)?task(?:\s*[:=-])?/i, '')
      .replace(/^add\s+(?:a\s+)?task(?:\s*[:=-])?/i, '')
      .replace(/^new\s+task(?:\s*[:=-])?/i, '')
      .replace(/^assign\s+(?:a\s+)?task(?:\s*[:=-])?/i, '')
      .replace(/^remind\s+me\s+to(?:\s*[:=-])?/i, '')
      .trim();

    let priority = 'medium';
    if (/urgent|critical|asap|emergency/i.test(text)) priority = 'urgent';
    else if (/high\s+priority|high/i.test(text)) priority = 'high';
    else if (/low\s+priority|low/i.test(text)) priority = 'low';

    let dueDays = 1;
    if (/today/i.test(text)) dueDays = 0;
    else if (/tomorrow/i.test(text)) dueDays = 1;
    else if (/in\s+(\d+)\s+days?/i.test(text)) {
      const m = text.match(/in\s+(\d+)\s+days?/i);
      dueDays = parseInt(m[1], 10) || 1;
    } else if (/next\s+week/i.test(text)) dueDays = 7;
    else if (/friday/i.test(text)) dueDays = 4;
    else if (/monday/i.test(text)) dueDays = 3;

    const due_date = new Date(Date.now() + dueDays * 86400000).toISOString().split('T')[0];

    let assigned_to = defaultAssignee || user?.id || user?.user_id;
    let assignee_name = user?.name || 'Bhumi Sanghvi';

    // Scan for assigned team member in text (e.g. "assign task to Rahul: ...", "create task for Priya", "... to Yash")
    const searchUsersList = (assignableUsers && assignableUsers.length > 0) ? assignableUsers : teamUsers;
    if (Array.isArray(searchUsersList) && searchUsersList.length > 0) {
      for (const u of searchUsersList) {
        if (!u.name) continue;
        const fullName = u.name.trim();
        const firstName = fullName.split(/\s+/)[0];

        const hasFull = new RegExp(`\\b${fullName}\\b`, 'i').test(text);
        const hasFirst = firstName.length >= 3 && new RegExp(`(?:to|for|assign)\\s+${firstName}\\b`, 'i').test(text);

        if (hasFull || hasFirst) {
          assigned_to = u.id;
          assignee_name = u.name;
          clean = clean
            .replace(new RegExp(`(?:to|for)\\s+${fullName}`, 'gi'), '')
            .replace(new RegExp(`(?:to|for)\\s+${firstName}`, 'gi'), '')
            .trim();
          break;
        }
      }
    }

    clean = clean
      .replace(/(?:with|having)?\s*(?:urgent|high|medium|low)\s*priority/gi, '')
      .replace(/due\s+(?:today|tomorrow|friday|monday|next\s+week|in\s+\d+\s+days?)/gi, '')
      .replace(/^[:\s-]+|[:\s-]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      title: clean || 'New Mission Control Task',
      priority,
      due_date,
      assigned_to,
      assignee_name,
      description: `Created via OLL AI Assistant from prompt: "${text}"`,
    };
  };

  const promptCreateTaskConfirmation = (taskDetails) => {
    const isSelf = !taskDetails.assigned_to || taskDetails.assigned_to === currentUserId;
    const assignedLabel = taskDetails.assignee_name || (isSelf ? `Myself (${currentUserName})` : 'Team Member');

    const confCard = {
      id: `task-create-${Date.now()}`,
      actionType: 'create_task',
      title: 'Are you sure you want to create this task?',
      description: 'Please review the important task details before saving to Mission Control:',
      details: [
        { label: 'Task Title', value: taskDetails.title },
        { label: 'Description', value: taskDetails.description || 'None provided' },
        { label: 'Assigned Person', value: assignedLabel },
        { label: 'Deadline', value: taskDetails.due_date ? taskDetails.due_date.split('T')[0] : 'None' },
        { label: 'Priority', value: (taskDetails.priority || 'medium').toUpperCase() },
      ],
      payload: taskDetails,
      confirmLabel: 'Confirm – Create Task',
      cancelLabel: 'Cancel – Return to Editing',
      danger: false,
      status: 'pending',
    };

    setPendingConfirmation(confCard);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `📋 **Are you sure you want to create this task?**\n\n• **Task Title:** ${taskDetails.title}\n• **Assigned Person:** ${assignedLabel}\n• **Deadline:** ${taskDetails.due_date ? taskDetails.due_date.split('T')[0] : 'None'}\n• **Priority:** ${(taskDetails.priority || 'medium').toUpperCase()}`,
        confirmationCard: confCard,
        nextActions: getTaskActionChips(),
        time: 'Just now',
      },
    ]);
  };

  const promptDeleteTaskConfirmation = (task) => {
    if (!task) return;
    if ((task.status || '').toLowerCase() === 'completed') {
      Alert.alert('Cannot Delete', 'Completed tasks cannot be deleted.');
      return;
    }
    if (!canEditTask(task)) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Access denied.',
          nextActions: getTaskActionChips(),
          time: 'Just now',
        },
      ]);
      return;
    }

    const confCard = {
      id: `task-del-${task.id || Date.now()}`,
      actionType: 'delete_task',
      title: `Delete Task ${task.code || 'TASK'}?`,
      description: 'Are you sure you want to permanently delete this task from Mission Control?',
      details: [
        { label: 'Task Code', value: task.code || 'TASK' },
        { label: 'Title', value: task.title },
        { label: 'Priority', value: (task.priority || 'medium').toUpperCase() },
        { label: 'Status', value: (task.status || 'pending').toUpperCase() },
      ],
      payload: task,
      confirmLabel: 'Yes, Delete Task',
      cancelLabel: 'No, Keep Task',
      danger: true,
      status: 'pending',
    };

    setPendingConfirmation(confCard);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `⚠️ **Confirm Task Deletion:**\n\nAre you sure you want to delete **${task.code} — ${task.title}**? This cannot be undone.`,
        confirmationCard: confCard,
        nextActions: ['My Tasks'],
        time: 'Just now',
      },
    ]);
  };

  const promptReassignTaskConfirmation = (task, targetUser) => {
    const canManageTarget = isUserAdmin || (assignableUsers || []).some((u) => u.id === targetUser?.id);
    if (!canManageTarget) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Access denied.',
          nextActions: ['My Tasks'],
          time: 'Just now',
        },
      ]);
      return;
    }

    const currentAssignee = task.assignee_name || task.assigned_to_name || 'Myself';
    const confCard = {
      id: `task-reassign-${Date.now()}`,
      actionType: 'reassign_task',
      taskCode: task.code || 'TASK',
      taskTitle: task.title,
      title: `Reassign ${task.code || 'Task'} to ${targetUser.name}?`,
      description: `Please confirm reassigning this task from ${currentAssignee} to ${targetUser.name}:`,
      details: [
        { label: 'Task Code', value: task.code || 'TASK' },
        { label: 'Task Title', value: task.title },
        { label: 'Current Assignee', value: currentAssignee },
        { label: 'New Assignee', value: targetUser.name },
        { label: 'Priority', value: (task.priority || 'medium').toUpperCase() },
      ],
      payload: {
        taskId: task.id,
        taskCode: task.code,
        taskTitle: task.title,
        assigned_to: targetUser.id,
        targetUserName: targetUser.name,
      },
      confirmLabel: `Yes, Reassign to ${targetUser.name.split(' ')[0]}`,
      cancelLabel: 'No, Cancel',
      danger: false,
      status: 'pending',
    };

    setPendingConfirmation(confCard);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `👤 **Confirm Task Reassignment:**\n\nAre you sure you want to reassign task **${task.code || ''} — "${task.title}"** to **${targetUser.name}**?`,
        confirmationCard: confCard,
        nextActions: ['My Tasks', 'Create Task'],
        time: 'Just now',
      },
    ]);
  };

  const handleCompleteTask = async (task) => {
    if (!task?.id) return;
    setIsTyping(true);
    const res = await api.updateTask(task.id, { status: 'completed' });
    setIsTyping(false);

    if (res.success && res.task) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `🎉 **Task Completed!** Task **${res.task.code || ''} — "${res.task.title}"** has been marked as Completed in Mission Control.`,
          taskCard: res.task,
          nextActions: ['My Tasks', 'Create Task'],
          time: 'Just now',
        },
      ]);
    } else {
      const isAccess = res.status === 403 || res.error?.includes('403') || res.error?.toLowerCase().includes('permission') || res.error?.toLowerCase().includes('not allowed');
      const errText = isAccess
        ? `⛔ **Access Denied:** You don't have access to it. ${res.error || 'You lack permissions to complete this task.'}`
        : `❌ **Failed to complete task:** ${res.error || 'Failed to complete task'}`;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: errText,
          nextActions: ['My Tasks'],
          time: 'Just now',
        },
      ]);
    }
  };

  const handleStartTask = async (task) => {
    if (!task?.id) return;
    setIsTyping(true);
    const res = await api.updateTask(task.id, { status: 'in_progress' });
    setIsTyping(false);

    if (res.success && res.task) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `⏳ **Task In Progress:** Task **${res.task.code || ''} — "${res.task.title}"** is now in progress.`,
          taskCard: res.task,
          nextActions: ['My Tasks', 'Complete Task'],
          time: 'Just now',
        },
      ]);
    } else {
      const isAccess = res.status === 403 || res.error?.includes('403') || res.error?.toLowerCase().includes('permission') || res.error?.toLowerCase().includes('not allowed');
      const errText = isAccess
        ? `⛔ **Access Denied:** You don't have access to it. ${res.error || 'You lack permissions to start this task.'}`
        : `❌ **Failed to start task:** ${res.error || 'Failed to start task'}`;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: errText,
          nextActions: ['My Tasks'],
          time: 'Just now',
        },
      ]);
    }
  };

  const handleDeleteTask = (task) => {
    if (!task) return;
    if ((task.status || '').toLowerCase() === 'completed') {
      Alert.alert('Cannot Delete', 'Completed tasks cannot be deleted.');
      return;
    }
    if (!canEditTask(task)) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Access denied.',
          nextActions: getTaskActionChips(),
          time: 'Just now',
        },
      ]);
      return;
    }
    promptDeleteTaskConfirmation(task);
  };

  const handleCommentTask = async (task, comment) => {
    if (!task?.id || !comment) return;
    const res = await api.addTaskComment(task.id, comment);
    if (res.success) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `💬 **Comment Added to ${task.code || 'Task'}:**\n\n"${comment}"`,
          nextActions: ['My Tasks'],
          time: 'Just now',
        },
      ]);
    } else {
      const isAccess = res.status === 403 || res.error?.includes('403') || res.error?.toLowerCase().includes('permission') || res.error?.toLowerCase().includes('not allowed') || res.error?.toLowerCase().includes('access denied');
      const errText = isAccess
        ? 'Access denied.'
        : `❌ **Failed to add comment:** ${res.error || 'Could not post comment'}`;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: errText,
          nextActions: ['My Tasks'],
          time: 'Just now',
        },
      ]);
    }
  };

  const handleSubmitInlineTask = async (taskData) => {
    if (!taskData || !taskData.title) return;
    const myId = effectiveUser?.id || effectiveUser?.user_id;
    const assignedId = taskData.assigned_to || myId;

    // Check authorization: can user assign to assignedId?
    const canAssign = isUserAdmin || assignedId === myId || (assignableUsers || []).some((u) => u.id === assignedId);
    if (!canAssign) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Access denied.',
          nextActions: getTaskActionChips(),
          time: 'Just now',
        },
      ]);
      return;
    }

    promptCreateTaskConfirmation({
      title: taskData.title.trim(),
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date || null,
      assigned_to: assignedId,
      assignee_name: taskData.assignee_name,
    });
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
      let delRes = null;
      if (targetId) {
        delRes = await api.deleteSchoolInquiry(targetId);
      }
      setIsTyping(false);

      if (delRes && !delRes.success) {
        const isAccess = delRes.status === 403 || delRes.error?.includes('403') || delRes.error?.toLowerCase().includes('permission') || delRes.error?.toLowerCase().includes('not allowed');
        const errText = isAccess
          ? `⛔ **Access Denied:** You don't have access to it. Only the lead owner or an administrator can delete leads from the CRM database.`
          : `❌ **Failed to delete lead:** ${delRes.error || 'Server error'}`;

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: errText,
            nextActions: ['Add School Lead'],
            time: 'Just now',
          },
        ]);
        return;
      }

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

    if (confCard.actionType === 'create_task') {
      const taskPayload = confCard.payload || {};
      const res = await api.createTask({
        ...taskPayload,
        assigned_to: taskPayload.assigned_to || user?.id || user?.user_id,
      });
      setIsTyping(false);
      if (res.success && res.task) {
        const assigneeLabel = taskPayload.assignee_name || (taskPayload.assigned_to && taskPayload.assigned_to !== (user?.id || user?.user_id) ? 'Team Member' : 'Myself');
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `✅ **Task Created Successfully!**\n\nTask **${res.task.code || 'TSK'} — "${res.task.title}"** has been assigned to **${assigneeLabel}** and saved to OLL Mission Control. In-app & WhatsApp notifications triggered.`,
            taskCard: res.task,
            nextActions: getTaskActionChips(),
            time: 'Just now',
          },
        ]);
      } else {
        const isAccess = res.status === 403 || res.error?.includes('403') || res.error?.toLowerCase().includes('permission') || res.error?.toLowerCase().includes('not allowed') || res.error?.toLowerCase().includes('access denied');
        const errText = isAccess
          ? 'Access denied.'
          : `❌ **Failed to create task:** ${res.error || 'Server error'}`;
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: errText,
            nextActions: getTaskActionChips(),
            time: 'Just now',
          },
        ]);
      }
      return;
    }

    if (confCard.actionType === 'reassign_task') {
      const payload = confCard.payload || {};
      const res = await api.updateTask(payload.taskId, { assigned_to: payload.assigned_to });
      setIsTyping(false);
      if (res.success && res.task) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `✅ **Task Reassigned Successfully!**\n\nTask **${res.task.code || payload.taskCode} — "${res.task.title || payload.taskTitle}"** is now assigned to **${payload.targetUserName}**.\n• In-app & WhatsApp notifications dispatched.`,
            taskCard: res.task,
            nextActions: getTaskActionChips(),
            time: 'Just now',
          },
        ]);
      } else {
        const isAccess = res.status === 403 || res.error?.includes('403') || res.error?.toLowerCase().includes('permission') || res.error?.toLowerCase().includes('only') || res.error?.toLowerCase().includes('access denied');
        const errText = isAccess
          ? 'Access denied.'
          : `❌ **Failed to reassign task:** ${res.error || 'Server error'}`;
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: errText,
            nextActions: ['My Tasks'],
            time: 'Just now',
          },
        ]);
      }
      return;
    }

    if (confCard.actionType === 'delete_task') {
      const task = confCard.payload || {};
      const res = await api.deleteTask(task.id);
      setIsTyping(false);
      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🗑️ **Task Deleted:** Task **${task.code || ''} — ${task.title}** has been removed from Mission Control.`,
            nextActions: ['My Tasks', 'Create Task'],
            time: 'Just now',
          },
        ]);
      } else {
        const isAccess = res.status === 403 || res.error?.includes('403') || res.error?.toLowerCase().includes('permission') || res.error?.toLowerCase().includes('creator') || res.error?.toLowerCase().includes('access denied');
        const errText = isAccess
          ? 'Access denied.'
          : `❌ **Failed to delete task:** ${res.error || 'Permission denied or not found'}`;
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: errText,
            nextActions: ['My Tasks'],
            time: 'Just now',
          },
        ]);
      }
      return;
    }
  };

  const executeCancelledAction = async (confCard) => {
    if (!confCard) return;
    const schoolName = confCard.schoolName || confCard.payload?.title || confCard.taskTitle || 'the item';
    const actionName =
      confCard.actionType === 'delete' ? 'Permanent deletion' :
      confCard.actionType === 'schedule_meeting' ? 'Meeting scheduling' :
      confCard.actionType === 'add_note' ? 'Adding note' :
      confCard.actionType === 'archive' ? 'Archiving' :
      confCard.actionType === 'unarchive' ? 'Unarchiving' :
      confCard.actionType === 'create_task' ? 'Task creation' :
      confCard.actionType === 'reassign_task' ? 'Task reassignment' :
      confCard.actionType === 'delete_task' ? 'Task deletion' :
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

    if (confCard.actionType === 'create_task') {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `↩️ **Returned to Editing:** Here is your task draft. You can make adjustments before submitting:`,
          taskCreationCard: {
            initialTitle: confCard.payload?.title || '',
            initialPriority: confCard.payload?.priority || 'medium',
            initialAssigneeId: confCard.payload?.assigned_to || '',
            initialAssigneeName: confCard.payload?.assignee_name || '',
            initialDueDate: confCard.payload?.due_date || '',
            initialDescription: confCard.payload?.description || '',
            mode: confCard.payload?.assigned_to && confCard.payload?.assigned_to !== currentUserId ? 'assign' : 'self',
            canAssignToOthers,
            teamUsers: assignableUsers.length > 0 ? assignableUsers : teamUsers,
          },
          nextActions: getTaskActionChips(),
          time: 'Just now',
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        text: `🚫 **Operation Cancelled:** ${actionName} for **${schoolName}** was cancelled. No changes have been made to your database.`,
        nextActions: ['Add School Lead', 'My Tasks'],
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
    if (!canAccessSchoolCrm) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Access denied.',
          time: 'Just now',
        },
      ]);
      return;
    }
    const userUid = effectiveUser?.id || effectiveUser?.user_id || '';
    const isAdmin = isUserAdmin;
    const isOwner = !target.assigned_to || target.assigned_to === userUid || target.added_by === userUid;
    if (!isAdmin && !isOwner) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Access denied.',
          time: 'Just now',
        },
      ]);
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
    if (!isUserAdmin) {
      Alert.alert('Access Denied', 'Access denied.');
      return;
    }
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
        nextActions: ['Follow Up on WhatsApp', 'Follow Up Call', 'Generate Proposal Quote'],
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

  // Add Comment directly from View Dossier Modal (Web App Sync)
  const handleAddViewCommentSubmit = async () => {
    if (!newViewComment.trim() || !viewTargetLead) return;
    const text = newViewComment.trim();
    setIsAddingViewComment(true);

    const author = user?.name || 'CRM Assistant';
    const nowIso = new Date().toISOString();

    const newCommentObj = {
      text,
      author,
      created_at: nowIso,
    };

    setViewCommentsList((prev) => [newCommentObj, ...prev]);
    setNewViewComment('');

    if (viewTargetLead.id) {
      await api.addSchoolComment(viewTargetLead.id, text, author);
    }

    setMessages((prev) =>
      prev.map((m) => {
        if (m.leadCard && (m.leadCard.id === viewTargetLead.id || m.leadCard.schoolName === viewTargetLead.schoolName)) {
          const updatedComments = [newCommentObj, ...(m.leadCard.comments || [])];
          return {
            ...m,
            leadCard: {
              ...m.leadCard,
              comments: updatedComments,
            },
          };
        }
        return m;
      })
    );

    setViewHistoryList((prev) => [
      {
        type: 'note',
        date: nowIso,
        description: `Comment: "${text}"`,
        user: author,
      },
      ...prev,
    ]);

    setIsAddingViewComment(false);
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

    if (['create_lead', 'retrieve_leads', 'follow_up'].includes(action.id) && !canAccessSchoolCrm) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Access denied.',
          time: 'Just now',
        },
      ]);
      return;
    }

    if (action.id === 'create_lead') {
      if (!isUserAdmin) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'Access denied.',
            time: 'Just now',
          },
        ]);
        return;
      }
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
          if (!l) return '';
          const sName = l.school_name || l.schoolName || l.name || 'School';
          const statusBadge = (l.status || 'new').toUpperCase();
          const contact = l.contact_name ? `${l.contact_name} (${l.contact_role || 'Contact'})` : 'Principal';
          const loc = l.location || l.city || 'Mumbai';
          const board = l.board || 'CBSE';
          const phone = l.phone || l.mobile || 'N/A';
          return `${idx + 1}. **${sName}** • \`${statusBadge}\`\n   📍 ${loc} • 🎓 ${board}\n   👤 ${contact} • 📞 \`${phone}\``;
        }).filter(Boolean).join('\n\n');

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📋 **Live CRM School Leads (${res.inquiries.length} Total):**\n\n${leadLines}\n\n*Tip: To inspect or take actions on any school, type "Show lead [School Name]" or "Retrieve lead for [School Name]".*`,
            nextActions: isUserAdmin ? ['Add School Lead'] : ['Tasks'],
            time: 'Just now',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📋 **No School Leads Found:** No active inquiries currently recorded in your CRM pipeline.`,
            nextActions: isUserAdmin ? ['Add School Lead'] : ['Tasks'],
            time: 'Just now',
          },
        ]);
      }
      return;
    } else if (action.id === 'follow_up') {
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
            nextActions: isUserAdmin ? ['Add School Lead'] : ['Tasks'],
            time: 'Just now',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: res.error || 'No follow-up leads found for your account.',
            nextActions: isUserAdmin ? ['Add School Lead'] : ['Tasks'],
            time: 'Just now',
          },
        ]);
      }
    } else if (action.id === 'my_tasks') {
      const res = await api.fetchTasks('my');
      setIsTyping(false);
      let tasksList = (res.success && Array.isArray(res.tasks)) ? res.tasks : [];
      const taskCount = tasksList.length;
      const pendingCount = tasksList.filter((t) => t.status !== 'completed').length;
      const completedCount = taskCount - pendingCount;

      const myTasksText = taskCount > 0
        ? `📋 **OLL Mission Control — My Tasks (${taskCount}):**\nYou have **${pendingCount} active / pending** tasks and **${completedCount} completed** tasks:`
        : `📋 **Mission Control Tasks:** You currently have no tasks assigned to you. Tap **Create Task** to add one.`;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: myTasksText,
          taskListCard: {
            title: 'Assigned Mission Tasks',
            subtitle: `${pendingCount} active • ${completedCount} completed`,
            tasks: tasksList,
          },
          nextActions: isUserAdmin ? ['Create Task', "Today's Tasks", 'Add School Lead'] : ['Create Task', "Today's Tasks"],
          time: 'Just now',
        },
      ]);
      return;
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
  const handleSend = async (overrideText = null) => {
    const hasOverride = typeof overrideText === 'string';
    const rawText = String((hasOverride ? overrideText : inputText) || '').trim();
    if (!rawText) return;

    const userText = rawText;
    if (!hasOverride) {
      setInputText('');
    }
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

    // ── CRM ACCESS CHECK (Chatbot Permission-Aware Operations) ──
    const isCrmIntent =
      lower.includes('lead') ||
      lower.includes('school') ||
      lower.includes('follow-up') ||
      lower.includes('followup') ||
      lower.includes('proposal') ||
      lower.includes('mou') ||
      lower.includes('invoice') ||
      ((lower.includes('meeting') || lower.includes('demo')) && !lower.includes('task')) ||
      (lower.includes('status') && !lower.includes('task')) ||
      lower.includes('convert') ||
      lower.includes('inquiry');

    if (isCrmIntent && !canAccessSchoolCrm) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Access denied.',
          time: 'Just now',
        },
      ]);
      return;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── TASK MANAGEMENT IN AI CHAT (OLL Mission Control Integration) ─────────
    // ══════════════════════════════════════════════════════════════════════════

    // ── T0. Create Task for Myself ──
    const isCreateTaskForMyself =
      lower === 'create task for myself' ||
      lower === 'create a task for myself' ||
      lower === 'task for myself' ||
      lower === 'add task for me' ||
      lower === 'task for me' ||
      lower.startsWith('create task for myself') ||
      lower.startsWith('create a task for myself') ||
      lower.startsWith('add task for me') ||
      lower.includes('add task for me');

    if (isCreateTaskForMyself) {
      setIsTyping(false);
      const myId = effectiveUser?.id || effectiveUser?.user_id;
      const myName = effectiveUser?.name || 'Myself';
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '➕ **Create Task:**\nFill in the title, priority, and deadline below:',
          taskCreationCard: {
            initialTitle: userText.replace(/(?:create\s+(?:a\s+)?task\s+for\s+myself|add\s+task\s+for\s+me)[:\s-]*/i, '').trim(),
            initialPriority: 'medium',
            initialAssigneeId: myId,
            initialAssigneeName: myName,
            mode: 'self',
            canAssignToOthers,
            teamUsers: assignableUsers.length > 0 ? assignableUsers : teamUsers,
          },
          nextActions: getTaskActionChips(),
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── T0b. Verify Assignment Scope if Target Person Specified ──
    const assignPersonMatch = userText.match(/(?:create\s+(?:a\s+)?task\s+for|assign\s+(?:a\s+)?task\s+to|new\s+task\s+for|assign\s+to)\s+([A-Za-z\s]+?)(?:\s*[:;,]|\s+due|\s+with|\s+priority|$)/i);
    if (assignPersonMatch) {
      const targetNameRaw = assignPersonMatch[1].trim().toLowerCase();
      const isTargetMyself = targetNameRaw === 'myself' || targetNameRaw === 'me';
      if (!isTargetMyself) {
        const eligible = (assignableUsers || []).find((u) => {
          const fn = (u.name || '').toLowerCase();
          const first = fn.split(/\s+/)[0];
          return fn.includes(targetNameRaw) || targetNameRaw.includes(fn) || (first.length >= 3 && targetNameRaw.includes(first));
        });

        if (!eligible) {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: 'Access denied.',
              time: 'Just now',
            },
          ]);
          return;
        }
      }
    }

    // ── T0c. Show Tasks Assigned to People I Manage ──
    const isManagedTasks =
      lower.includes("people i manage") ||
      lower.includes("managed users") ||
      lower.includes("managed tasks") ||
      lower.includes("team tasks") ||
      lower.includes("tasks of my team") ||
      lower === "team tasks";

    if (isManagedTasks) {
      const res = await api.fetchTasks('team');
      setIsTyping(false);
      let tasksList = (res.success && Array.isArray(res.tasks)) ? res.tasks : [];
      const taskCount = tasksList.length;
      const pendingCount = tasksList.filter((t) => t.status !== 'completed').length;
      const completedCount = taskCount - pendingCount;

      const teamTasksText = taskCount > 0
        ? `📋 **Tasks Assigned to People You Manage (${taskCount}):**\nThere are **${pendingCount} active / pending** tasks and **${completedCount} completed** tasks in your managed scope:`
        : `📋 **Managed Tasks:** No tasks currently found for people in your management scope.`;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: teamTasksText,
          taskListCard: {
            title: 'Managed Team Tasks',
            subtitle: `${pendingCount} active • ${completedCount} completed`,
            tasks: tasksList,
          },
          nextActions: ['My Tasks', 'Create Task'],
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── T0d. Edit / Update Task for a Particular Person ──
    const isEditTaskIntent =
      lower.startsWith('edit task') ||
      lower.startsWith('edit the task') ||
      lower.startsWith('update task') ||
      lower.startsWith('update the task') ||
      lower.startsWith('update deadline') ||
      lower.startsWith('update the deadline') ||
      lower.startsWith('change status of task') ||
      lower.startsWith('change the status of');

    if (isEditTaskIntent) {
      setIsTyping(false);
      let matchedTargetPerson = null;
      const forPersonMatch = userText.match(/(?:for|assigned to|of)\s+([A-Za-z\s]+?)(?:'s|\s+task|\s*$)/i);
      if (forPersonMatch) {
        const rawPersonName = forPersonMatch[1].trim().toLowerCase();
        if (rawPersonName !== 'myself' && rawPersonName !== 'me') {
          const eligible = (assignableUsers || []).find((u) => {
            const fn = (u.name || '').toLowerCase();
            const first = fn.split(/\s+/)[0];
            return fn.includes(rawPersonName) || rawPersonName.includes(fn) || (first.length >= 3 && rawPersonName.includes(first));
          });
          if (!eligible) {
            setMessages((prev) => [
              ...prev,
              {
                sender: 'ai',
                text: 'Access denied.',
                time: 'Just now',
              },
            ]);
            return;
          }
          matchedTargetPerson = eligible;
        }
      }

      const taskRes = await api.fetchTasks(matchedTargetPerson ? 'team' : 'my');
      const allTasks = (taskRes.success && Array.isArray(taskRes.tasks)) ? taskRes.tasks : [];
      let taskToEdit = null;
      if (matchedTargetPerson) {
        taskToEdit = allTasks.find((t) => t.assigned_to === matchedTargetPerson.id);
      }
      if (!taskToEdit) {
        const codeM = userText.match(/tsk-\d+/i);
        if (codeM) {
          taskToEdit = allTasks.find((t) => (t.code || '').toUpperCase() === codeM[0].toUpperCase());
        }
      }
      if (!taskToEdit && allTasks.length > 0) {
        taskToEdit = allTasks[0];
      }

      if (taskToEdit) {
        openEditTaskModal(taskToEdit);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `✏️ Opened task editor for **"${taskToEdit.title}"** (${taskToEdit.code || 'TASK'}).`,
            nextActions: ['My Tasks'],
            time: 'Just now',
          },
        ]);
        return;
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: '🔍 Could not find a matching task to edit.',
            nextActions: ['My Tasks', 'Create Task'],
            time: 'Just now',
          },
        ]);
        return;
      }
    }

    // ── T1. Task Listing: Today's Tasks, Overdue Tasks, My Tasks ──
    const isTodayTasks =
      lower === "today's tasks" ||
      lower === "today's task" ||
      lower === "today tasks" ||
      lower === "today task" ||
      lower === "tasks today" ||
      lower.includes("today's task") ||
      lower.includes("task today") ||
      lower.includes("tasks for today");

    const isOverdueTasks =
      lower === "overdue tasks" ||
      lower === "overdue task" ||
      lower.includes("overdue task") ||
      lower.includes("pending tasks") ||
      lower.includes("tasks overdue");

    const isMyTasks =
      lower === "my tasks" ||
      lower === "show tasks" ||
      lower === "list tasks" ||
      lower === "tasks" ||
      lower === "view tasks" ||
      lower === "get tasks" ||
      lower === "all tasks" ||
      lower.includes("my tasks") ||
      lower.includes("show my tasks") ||
      lower.includes("list my tasks") ||
      lower.includes("view my tasks") ||
      lower.includes("task list") ||
      lower.includes("mission control tasks");

    if (isTodayTasks || isOverdueTasks || isMyTasks) {
      if (isTodayTasks) {
        const res = await api.fetchTodaysTasks();
        setIsTyping(false);
        const todayTasks = (res.success && Array.isArray(res.today)) ? res.today : [];
        const overdueTasks = (res.success && Array.isArray(res.overdue)) ? res.overdue : [];
        const combined = [...overdueTasks, ...todayTasks];

        const summaryText = combined.length > 0
          ? `📅 **Today's Mission Control Tasks (${combined.length}):**\nYou have **${todayTasks.length} tasks scheduled for today**${overdueTasks.length > 0 ? ` and **${overdueTasks.length} overdue tasks** requiring attention` : ''}:`
          : `🎉 **All Clear for Today!** You have no pending tasks scheduled for today in Mission Control.`;

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: summaryText,
            taskListCard: {
              title: "Today's Schedule & Deadlines",
              subtitle: `${combined.length} tasks assigned to you`,
              tasks: combined,
            },
            nextActions: getTaskActionChips(),
            time: 'Just now',
          },
        ]);
        return;
      }

      // Overdue or General My Tasks
      const res = await api.fetchTasks('my');
      setIsTyping(false);
      let tasksList = (res.success && Array.isArray(res.tasks)) ? res.tasks : [];

      if (isOverdueTasks) {
        const now = new Date();
        tasksList = tasksList.filter((t) => {
          if (t.status === 'completed') return false;
          if (!t.due_date) return false;
          return new Date(t.due_date) < now;
        });

        const overdueText = tasksList.length > 0
          ? `⚠️ **Overdue Tasks Alert (${tasksList.length}):**\nThe following tasks are past their deadline and need immediate action:`
          : `✅ **No Overdue Tasks!** You're completely up to date with your Mission Control deliverables.`;

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: overdueText,
            taskListCard: {
              title: 'Overdue Mission Control Tasks',
              subtitle: `${tasksList.length} past-due items`,
              tasks: tasksList,
            },
            nextActions: getTaskActionChips(),
            time: 'Just now',
          },
        ]);
        return;
      }

      // General My Tasks
      const taskCount = tasksList.length;
      const pendingCount = tasksList.filter((t) => t.status !== 'completed').length;
      const completedCount = taskCount - pendingCount;

      const myTasksText = taskCount > 0
        ? `📋 **OLL Mission Control — My Tasks (${taskCount}):**\nYou have **${pendingCount} active / pending** tasks and **${completedCount} completed** tasks:`
        : `📋 **Mission Control Tasks:** You currently have no tasks assigned to you.`;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: myTasksText,
          taskListCard: {
            title: 'Assigned Mission Tasks',
            subtitle: `${pendingCount} active • ${completedCount} completed`,
            tasks: tasksList,
          },
          nextActions: getTaskActionChips(),
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── T2. Task Creation: Empty / Prompt Form Intent ──
    const isCreateTaskPromptIntent =
      lower === 'create task' ||
      lower === 'new task' ||
      lower === 'add task' ||
      lower === 'assign task' ||
      lower === 'make task';

    if (isCreateTaskPromptIntent) {
      setIsTyping(false);
      const myId = effectiveUser?.id || effectiveUser?.user_id;
      const myName = effectiveUser?.name || 'Myself';
      const eligibleUsers = (assignableUsers && assignableUsers.length > 0) ? assignableUsers : teamUsers;
      const mode = canAssignToOthers ? 'assign' : 'self';

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '➕ **Create Task:**\nFill in the task details below:',
          taskCreationCard: {
            initialTitle: '',
            initialPriority: 'medium',
            initialAssigneeId: myId,
            initialAssigneeName: myName,
            mode: canAssignToOthers ? 'assign' : 'self',
            canAssignToOthers,
            teamUsers: eligibleUsers,
          },
          nextActions: getTaskActionChips(),
          time: 'Just now',
        },
      ]);
      return;
    }

    // ── T2b. Task Reassignment Intent ("reassign task TSK-0004 to Priya", "assign task TSK-0004 to Rahul") ──
    const hasTaskCode = /tsk-\d+/i.test(lower);
    const isReassignIntent =
      lower.startsWith('reassign') ||
      (hasTaskCode && (lower.startsWith('assign task') || lower.startsWith('assign') || lower.startsWith('reassign task')));

    if (isReassignIntent) {
      const codeMatch = userText.match(/tsk-\d+/i);
      const taskCode = codeMatch ? codeMatch[0].toUpperCase() : '';

      let targetUser = null;
      const allCandidateUsers = (teamUsers && teamUsers.length > 0) ? teamUsers : assignableUsers;
      if (Array.isArray(allCandidateUsers)) {
        for (const u of allCandidateUsers) {
          if (!u.name) continue;
          const fullName = u.name.trim();
          const firstName = fullName.split(/\s+/)[0];
          const hasFull = new RegExp(`\\b${fullName}\\b`, 'i').test(userText);
          const hasFirst = firstName.length >= 3 && new RegExp(`(?:to|for)\\s+${firstName}\\b`, 'i').test(userText);
          if (hasFull || hasFirst) {
            targetUser = u;
            break;
          }
        }
      }

      if (targetUser) {
        const canManageTarget = isUserAdmin || (assignableUsers || []).some((u) => u.id === targetUser.id);
        if (!canManageTarget) {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: 'Access denied.',
              nextActions: ['My Tasks'],
              time: 'Just now',
            },
          ]);
          return;
        }
      }

      const res = await api.fetchTasks('my');
      setIsTyping(false);
      const tasks = (res.success && Array.isArray(res.tasks)) ? res.tasks : [];
      let matchedTask = tasks.find((t) => (t.code || '').toUpperCase() === taskCode);
      if (!matchedTask && !taskCode && tasks.length > 0) {
        matchedTask = tasks[0];
      }

      if (!matchedTask) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Task Not Found:** Could not locate task **"${taskCode || userText}"** to reassign.`,
            taskListCard: { title: 'Available Tasks', tasks },
            nextActions: ['My Tasks'],
            time: 'Just now',
          },
        ]);
        return;
      }

      if (!targetUser) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `👤 **Whom should task ${matchedTask.code || ''} be reassigned to?**\nPlease specify a team member name (e.g., *"Assign ${matchedTask.code || 'task'} to Priya"*).`,
            nextActions: ['My Tasks'],
            time: 'Just now',
          },
        ]);
        return;
      }

      promptReassignTaskConfirmation(matchedTask, targetUser);
      return;
    }

    // ── T2c. Assign Task Prompt for Member ("assign task to Rahul", "create task for Priya") ──
    const isAssignForMemberPrompt =
      (lower.startsWith('assign task to') ||
       lower.startsWith('assign to') ||
       lower.startsWith('create task for') ||
       lower.startsWith('new task for')) &&
      !lower.includes(':') &&
      !lower.includes(';') &&
      !lower.includes('due') &&
      !lower.includes('priority') &&
      !/tsk-\d+/i.test(lower);

    if (isAssignForMemberPrompt) {
      let matchedMember = null;
      const allCandidateUsers = (teamUsers && teamUsers.length > 0) ? teamUsers : assignableUsers;
      if (Array.isArray(allCandidateUsers)) {
        for (const u of allCandidateUsers) {
          if (!u.name) continue;
          const fullName = u.name.trim();
          const firstName = fullName.split(/\s+/)[0];
          if (
            new RegExp(`(?:to|for)\\s+${fullName}`, 'i').test(userText) ||
            (firstName.length >= 3 && new RegExp(`(?:to|for)\\s+${firstName}`, 'i').test(userText))
          ) {
            matchedMember = u;
            break;
          }
        }
      }

      if (matchedMember) {
        const canManageMember = isUserAdmin || (assignableUsers || []).some((u) => u.id === matchedMember.id);
        if (!canManageMember) {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: 'Access denied.',
              nextActions: ['My Tasks'],
              time: 'Just now',
            },
          ]);
          return;
        }

        const eligibleUsers = (assignableUsers && assignableUsers.length > 0) ? assignableUsers : teamUsers;
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `➕ **Assign New Task to ${matchedMember.name}:**\nEnter the task title, priority, and deadline below:`,
            taskCreationCard: {
              initialTitle: '',
              initialPriority: 'medium',
              initialAssigneeId: matchedMember.id,
              initialAssigneeName: matchedMember.name,
              teamUsers: eligibleUsers,
            },
            nextActions: ['My Tasks', "Today's Tasks"],
            time: 'Just now',
          },
        ]);
        return;
      }
    }

    // ── T3. Task Creation: Natural Language with Details ──
    const isCreateTaskWithDetails =
      lower.startsWith('create task') ||
      lower.startsWith('create a task') ||
      lower.startsWith('add task') ||
      lower.startsWith('add a task') ||
      lower.startsWith('new task') ||
      lower.startsWith('remind me to') ||
      lower.startsWith('assign task') ||
      ((lower.includes('task:') || lower.includes('task -')) && !lower.includes('comment'));

    if (isCreateTaskWithDetails) {
      setIsTyping(false);
      const taskDetails = extractTaskDetailsFromText(userText);
      const eligibleUsers = (assignableUsers && assignableUsers.length > 0) ? assignableUsers : teamUsers;
      if (!taskDetails.title || taskDetails.title.toLowerCase() === 'new task') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: '➕ **Create New Task:** Please specify the task title or fill the quick form below:',
            taskCreationCard: { initialTitle: '', initialPriority: 'medium', teamUsers: eligibleUsers },
            nextActions: ['My Tasks'],
            time: 'Just now',
          },
        ]);
        return;
      }

      promptCreateTaskConfirmation(taskDetails);
      return;
    }

    // ── T4. Complete Task via Chat ("complete task TSK-0004", "finish task ...") ──
    const isCompleteTaskIntent =
      lower.startsWith('complete task') ||
      lower.startsWith('finish task') ||
      lower.startsWith('mark task done') ||
      lower.startsWith('mark task as done') ||
      lower.startsWith('mark task completed') ||
      lower.startsWith('done task') ||
      ((lower.includes('complete') || lower.includes('done')) && /tsk-\d+/i.test(lower));

    if (isCompleteTaskIntent) {
      const codeMatch = userText.match(/tsk-\d+/i);
      const query = codeMatch ? codeMatch[0].toUpperCase() : userText.replace(/complete|task|finish|mark|as|done|completed/gi, '').trim();

      const res = await api.fetchTasks('my');
      setIsTyping(false);
      const tasks = (res.success && Array.isArray(res.tasks)) ? res.tasks : [];

      let matchedTask = null;
      if (codeMatch) {
        matchedTask = tasks.find((t) => (t.code || '').toUpperCase() === query);
      }
      if (!matchedTask && query) {
        const qLower = query.toLowerCase();
        matchedTask = tasks.find((t) => (t.title || '').toLowerCase().includes(qLower));
      }

      if (matchedTask) {
        await handleCompleteTask(matchedTask);
        return;
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Task Not Found:** Could not find a task matching **"${query || userText}"** in your assigned tasks. Here is your current task list:`,
            taskListCard: {
              title: 'Your Current Tasks',
              tasks,
            },
            nextActions: ['My Tasks', 'Create Task'],
            time: 'Just now',
          },
        ]);
        return;
      }
    }

    // ── T5. Delete Task via Chat ("delete task TSK-0002") ──
    const isDeleteTaskIntent =
      lower.startsWith('delete task') ||
      lower.startsWith('remove task') ||
      lower.startsWith('cancel task') ||
      (lower.includes('delete') && /tsk-\d+/i.test(lower));

    if (isDeleteTaskIntent) {
      const codeMatch = userText.match(/tsk-\d+/i);
      const query = codeMatch ? codeMatch[0].toUpperCase() : userText.replace(/delete|task|remove|cancel/gi, '').trim();

      const res = await api.fetchTasks('my');
      setIsTyping(false);
      const tasks = (res.success && Array.isArray(res.tasks)) ? res.tasks : [];

      let matchedTask = null;
      if (codeMatch) {
        matchedTask = tasks.find((t) => (t.code || '').toUpperCase() === query);
      }
      if (!matchedTask && query) {
        const qLower = query.toLowerCase();
        matchedTask = tasks.find((t) => (t.title || '').toLowerCase().includes(qLower));
      }

      if (matchedTask) {
        if ((matchedTask.status || '').toLowerCase() === 'completed') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `ℹ️ **Task Completed:** Task **"${matchedTask.title}"** (${matchedTask.code || 'TASK'}) is already completed and cannot be deleted.`,
              nextActions: getTaskActionChips(),
              time: 'Just now',
            },
          ]);
          return;
        }

        const userUid = user?.id || user?.user_id || '';
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        const isCreator = !matchedTask.assigned_by || matchedTask.assigned_by === userUid;
        if (!isAdmin && !isCreator) {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `⛔ **Access Denied:** You don't have access to it. Only the task creator or an administrator can delete tasks from Mission Control.`,
              nextActions: ['My Tasks'],
              time: 'Just now',
            },
          ]);
          return;
        }

        promptDeleteTaskConfirmation(matchedTask);
        return;
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Task Not Found:** Could not locate task **"${query || userText}"** to delete. Please specify a valid task code like \`TSK-0001\`.`,
            taskListCard: {
              title: 'Your Current Tasks',
              tasks,
            },
            nextActions: ['My Tasks'],
            time: 'Just now',
          },
        ]);
        return;
      }
    }

    // ── T6. Comment on Task via Chat ("comment on task TSK-0002: message") ──
    const isCommentTaskIntent =
      lower.startsWith('comment on task') ||
      lower.startsWith('add comment to task') ||
      lower.startsWith('note on task') ||
      lower.includes('task comment:');

    if (isCommentTaskIntent) {
      const codeMatch = userText.match(/tsk-\d+/i);
      let commentBody = '';
      if (userText.includes(':')) {
        commentBody = userText.split(':').slice(1).join(':').trim();
      } else {
        commentBody = userText
          .replace(/comment\s+on\s+task\s+[a-zA-Z0-9_-]+/i, '')
          .replace(/add\s+comment\s+to\s+task\s+[a-zA-Z0-9_-]+/i, '')
          .trim();
      }

      const res = await api.fetchTasks('my');
      setIsTyping(false);
      const tasks = (res.success && Array.isArray(res.tasks)) ? res.tasks : [];

      let matchedTask = null;
      if (codeMatch) {
        matchedTask = tasks.find((t) => (t.code || '').toUpperCase() === codeMatch[0].toUpperCase());
      }
      if (!matchedTask && tasks.length > 0) {
        matchedTask = tasks[0];
      }

      if (matchedTask && commentBody) {
        await handleCommentTask(matchedTask, commentBody);
        return;
      } else if (!matchedTask) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `🔍 **Task Not Found:** Please specify a valid task code (e.g., *"Comment on task TSK-0001: Sent the report"*).`,
            nextActions: ['My Tasks'],
            time: 'Just now',
          },
        ]);
        return;
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `💬 **Add Comment to ${matchedTask.code || 'Task'}:** Please enter what comment or update you want to post.`,
            nextActions: ['My Tasks'],
            time: 'Just now',
          },
        ]);
        return;
      }
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
      if (!isUserAdmin) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'Access denied.',
            time: 'Just now',
          },
        ]);
        return;
      }
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
          if (!l) return '';
          const sName = l.school_name || l.schoolName || l.name || 'School';
          const statusBadge = String(l.status || 'new').toUpperCase();
          const contact = l.contact_name ? `${l.contact_name} (${l.contact_role || 'Contact'})` : 'Principal';
          const loc = l.location || l.city || 'Mumbai';
          const board = l.board || 'CBSE';
          const phone = l.phone || l.mobile || 'N/A';
          return `${idx + 1}. **${sName}** • \`${statusBadge}\`\n   📍 ${loc} • 🎓 ${board}\n   👤 ${contact} • 📞 \`${phone}\``;
        }).filter(Boolean).join('\n\n');

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📋 **Live CRM School Leads (${res.inquiries.length} Total):**\n\n${leadLines}\n\n*Tip: To inspect or take actions on any school, type "Show lead [School Name]" or "Retrieve lead for [School Name]".*`,
            nextActions: isUserAdmin ? ['Add School Lead'] : ['Tasks'],
            time: 'Just now',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📋 **No School Leads Found:** No active inquiries currently recorded in your CRM pipeline.`,
            nextActions: isUserAdmin ? ['Add School Lead'] : ['Tasks'],
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

      // Priority 3: Generic queries without specific school name
      if (!matched && !queryLower) {
        const latest = findLatestLead();
        if (latest) {
          matched = { ...latest };
        } else if (res.success && Array.isArray(res.inquiries) && res.inquiries.length > 0) {
          matched = res.inquiries[0];
        }
      }

      if (!matched) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: queryLower
              ? `🔍 No matching lead found for "${queryName || 'this school'}" in your CRM records.`
              : '🔍 No school leads found in your CRM records.',
            time: 'Just now',
          },
        ]);
        return;
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
          id: matched.id ? String(matched.id) : `lead_${Date.now()}`,
          schoolName: schoolName,
          school_name: schoolName,
          contactPerson: (contactPerson && String(contactPerson).includes('(')) ? contactPerson : `${contactPerson} (${contactRole})`,
          contact_name: contactPerson ? String(contactPerson).replace(/\s*\([^)]*\)/, '').trim() : 'Principal',
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

      const userUid = user?.id || user?.user_id || '';
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      const isOwner = !lead.assigned_to || lead.assigned_to === userUid || lead.added_by === userUid;
      if (!isAdmin && !isOwner) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `⛔ **Access Denied:** You don't have access to it. Only the lead owner or an administrator can delete leads from the CRM database.`,
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

    // ── 14b. Action Intent: View Lead / Comments / Notes / Activity History ──
    const isViewIntent =
      lower.startsWith('view') ||
      lower.includes('view lead') ||
      lower.includes('show comments') ||
      lower.includes('view comments') ||
      lower.includes('show history') ||
      lower.includes('view history') ||
      lower.includes('activity history') ||
      lower.includes('view activity') ||
      lower.includes('view notes');

    if (isViewIntent && !lower.includes('view inquir')) {
      let q = userText
        .replace(/view\s+comments\s+(?:for|of)?/i, '')
        .replace(/show\s+comments\s+(?:for|of)?/i, '')
        .replace(/view\s+history\s+(?:for|of)?/i, '')
        .replace(/show\s+history\s+(?:for|of)?/i, '')
        .replace(/activity\s+history\s+(?:for|of)?/i, '')
        .replace(/view\s+activity\s+(?:for|of)?/i, '')
        .replace(/view\s+notes\s+(?:for|of)?/i, '')
        .replace(/view\s+lead(?:\s+for)?/i, '')
        .replace(/view(?:\s+for)?/i, '')
        .trim();

      const resolved = await resolveSchoolFromQuery(q);
      setIsTyping(false);

      const schoolLead = resolved.lead || target;
      if (schoolLead) {
        openViewLeadModal(schoolLead);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `👁️ **Viewing Dossier for ${schoolLead.schoolName || schoolLead.school_name}:**\n\nOpening comments, discussion notes, and full CRM activity history...`,
            leadCard: schoolLead,
            time: 'Just now',
          },
        ]);
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
      if (!isUserAdmin) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'Access denied.',
            time: 'Just now',
          },
        ]);
        return;
      }
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
          id: String(lead.id),
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

    if (lower === 'my task' || lower === 'my tasks' || lower.includes('my task')) {
      handleSend('My Tasks');
      return;
    }

    if (
      lower === 'create task' ||
      lower === 'new task' ||
      lower === 'add task' ||
      lower.includes('create task') ||
      lower.includes('add task') ||
      lower.includes('task for me') ||
      lower.includes('task for myself')
    ) {
      handleSend('Create Task');
      return;
    }

    if (lower.includes("today's tasks") || lower === "today's tasks" || lower === 'today tasks') {
      handleSend("Today's Tasks");
      return;
    }

    if (lower.includes('overdue tasks') || lower === 'overdue tasks') {
      handleSend('Overdue Tasks');
      return;
    }

    if (
      lower.includes('add school lead') ||
      lower.includes('add new school lead') ||
      lower === 'add school lead' ||
      lower === 'add new school lead' ||
      lower === 'add lead' ||
      lower === 'create lead' ||
      lower === 'add school'
    ) {
      if (!isUserAdmin) {
        setChatMode(true);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'Access denied.',
            time: 'Just now',
          },
        ]);
        return;
      }
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
      handleSend('Retrieve all leads');
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

      {/* Top Dark Green Header (hidden when Schools CRM, Field Visit, or Tasks is active, as they have dedicated headers) */}
      {activeTab !== 'schools' && activeTab !== 'field_visit' && activeTab !== 'my_space' && (
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
                onViewLead={openViewLeadModal}
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
                onCompleteTask={handleCompleteTask}
                onStartTask={handleStartTask}
                onEditTask={openEditTaskModal}
                onDeleteTask={handleDeleteTask}
                onCommentTask={handleCommentTask}
                onSubmitInlineTask={handleSubmitInlineTask}
                teamUsers={assignableUsers.length > 0 ? assignableUsers : teamUsers}
                canAssignToOthers={canAssignToOthers}
                canEditTask={canEditTask}
                isUserAdmin={isUserAdmin}
                onCreateTaskPress={() => handleSend('Create Task')}
                onAddTaskPress={() => handleSend('Create Task')}
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
        ) : activeTab === 'field_visit' ? (
          canAccessFieldVisit ? (
            <FieldVisitScreen
              user={effectiveUser}
              onBackToChat={() => setActiveTab('ai_chat')}
              onLogout={onLogout}
            />
          ) : (
            <AccessDeniedView
              moduleName="Field Visit"
              onBackToChat={() => setActiveTab('ai_chat')}
            />
          )
        ) : activeTab === 'schools' ? (
          canAccessSchoolCrm ? (
            <SchoolsCrmScreen
              user={effectiveUser}
              onBackToChat={() => setActiveTab('ai_chat')}
              onLogout={onLogout}
            />
          ) : (
            <AccessDeniedView
              moduleName="School CRM"
              onBackToChat={() => setActiveTab('ai_chat')}
            />
          )
        ) : activeTab === 'my_space' ? (
          <TasksScreen
            user={effectiveUser}
            onBackToChat={() => setActiveTab('ai_chat')}
            onLogout={onLogout}
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
            user={effectiveUser}
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

      {/* ── MODAL 12: View Comments, Notes & Activity History Modal (Web App View) ── */}
      <Modal
        visible={viewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalLargeCard, { maxHeight: '90%', paddingBottom: 16 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.modalLargeTitle, { fontSize: 16.5 }]} numberOfLines={1}>
                    {viewTargetLead?.schoolName || viewTargetLead?.school_name || 'School Dossier'}
                  </Text>
                  <View style={[
                    styles.viewStatusBadge,
                    viewTargetLead?.status === 'archived' ? { backgroundColor: '#F1F5F9' } :
                    viewTargetLead?.status === 'lost' ? { backgroundColor: '#FFE4E6' } :
                    viewTargetLead?.status === 'meeting_done' ? { backgroundColor: '#ECFDF5' } :
                    viewTargetLead?.status === 'meeting_scheduled' ? { backgroundColor: '#F5F3FF' } :
                    { backgroundColor: '#EFF6FF' }
                  ]}>
                    <Text style={[
                      styles.viewStatusBadgeText,
                      viewTargetLead?.status === 'archived' ? { color: '#64748B' } :
                      viewTargetLead?.status === 'lost' ? { color: '#E11D48' } :
                      viewTargetLead?.status === 'meeting_done' ? { color: '#059669' } :
                      viewTargetLead?.status === 'meeting_scheduled' ? { color: '#7C3AED' } :
                      { color: '#2563EB' }
                    ]}>
                      {(viewTargetLead?.status || 'NEW').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  Comments, Notes & Activity History (Web App CRM View)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setViewModalVisible(false)} style={{ padding: 4 }}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* School Quick Info Bar */}
            <View style={styles.viewQuickInfoBar}>
              <Text style={styles.viewQuickInfoItem} numberOfLines={1}>
                👤 {viewTargetLead?.contactPerson || viewTargetLead?.contact_name || 'Principal'}
              </Text>
              <Text style={styles.viewQuickInfoItem} numberOfLines={1}>
                📞 {viewTargetLead?.phone || 'N/A'}
              </Text>
              <Text style={styles.viewQuickInfoItem} numberOfLines={1}>
                📍 {viewTargetLead?.location || 'Mumbai'}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              {/* 1. Discussion Notes Section (Web App Notes) */}
              <View style={styles.viewSectionCard}>
                <View style={styles.viewSectionHeader}>
                  <Feather name="file-text" size={14} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={[styles.viewSectionTitle, { color: '#92400E' }]}>Discussion Notes</Text>
                </View>
                <View style={styles.viewNotesBox}>
                  <Text style={styles.viewNotesText}>
                    {viewTargetLead?.notes || 'No discussion notes logged yet for this school.'}
                  </Text>
                </View>
              </View>

              {/* 2. Comments Section (Web App Comments) */}
              <View style={styles.viewSectionCard}>
                <View style={styles.viewSectionHeader}>
                  <Feather name="message-square" size={14} color="#4F46E5" style={{ marginRight: 6 }} />
                  <Text style={[styles.viewSectionTitle, { color: '#3730A3' }]}>
                    Comments ({viewCommentsList.length})
                  </Text>
                </View>

                {/* Comments List */}
                {viewCommentsList.length > 0 ? (
                  <View style={{ marginBottom: 10, gap: 8 }}>
                    {viewCommentsList.map((c, idx) => (
                      <View key={idx} style={styles.viewCommentCard}>
                        <Text style={styles.viewCommentBody}>{c.text || c.comment}</Text>
                        <View style={styles.viewCommentFooter}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="user" size={11} color="#64748B" style={{ marginRight: 4 }} />
                            <Text style={styles.viewCommentAuthor}>{c.author || 'CRM User'}</Text>
                          </View>
                          <Text style={styles.viewCommentDate}>
                            {formatActivityDate(c.created_at || c.timestamp)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.viewEmptyBox}>
                    <Text style={styles.viewEmptyText}>No comments recorded yet.</Text>
                  </View>
                )}

                {/* Add a comment input */}
                <View style={styles.viewAddCommentRow}>
                  <TextInput
                    style={styles.viewAddCommentInput}
                    value={newViewComment}
                    onChangeText={setNewViewComment}
                    placeholder="Add a comment or note..."
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.viewAddCommentBtn, !newViewComment.trim() && { opacity: 0.6 }]}
                    onPress={handleAddViewCommentSubmit}
                    disabled={isAddingViewComment || !newViewComment.trim()}
                  >
                    {isAddingViewComment ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="send" size={14} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. Activity History Section (Web App Activity History) */}
              <View style={styles.viewSectionCard}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.viewSectionHeader, { justifyContent: 'space-between' }]}
                  onPress={() => setViewHistoryCollapsed(!viewHistoryCollapsed)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="clock" size={14} color="#0D9488" style={{ marginRight: 6 }} />
                    <Text style={[styles.viewSectionTitle, { color: '#115E59' }]}>
                      Activity History ({viewHistoryList.length})
                    </Text>
                  </View>
                  <Feather
                    name={viewHistoryCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={16}
                    color="#64748B"
                  />
                </TouchableOpacity>

                {!viewHistoryCollapsed && (
                  <View style={{ marginTop: 8 }}>
                    {isLoadingHistory ? (
                      <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#0D9488" />
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Loading history...</Text>
                      </View>
                    ) : viewHistoryList.length > 0 ? (
                      <View style={{ gap: 8 }}>
                        {viewHistoryList.map((item, idx) => {
                          const meta = getActivityTypeMeta(item.type);
                          return (
                            <View
                              key={idx}
                              style={[
                                styles.viewHistoryCard,
                                {
                                  backgroundColor: meta.bg,
                                  borderLeftColor: meta.border,
                                },
                              ]}
                            >
                              <View style={styles.viewHistoryTopRow}>
                                <View style={[styles.viewHistoryTypePill, { backgroundColor: meta.bg }]}>
                                  <Feather name={meta.icon} size={10} color={meta.color} style={{ marginRight: 3 }} />
                                  <Text style={[styles.viewHistoryTypeLabel, { color: meta.color }]}>
                                    {meta.label}
                                  </Text>
                                </View>
                                <Text style={styles.viewHistoryDate}>
                                  {formatActivityDate(item.date || item.created_at || item.timestamp)}
                                </Text>
                              </View>
                              <Text style={styles.viewHistoryDesc}>
                                {item.description || item.action || item.title || 'CRM Action recorded'}
                              </Text>
                              {(item.user || item.author) && (
                                <Text style={styles.viewHistoryAuthor}>
                                  Logged by {item.user || item.author}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.viewEmptyBox}>
                        <Text style={styles.viewEmptyText}>No activity history recorded yet.</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Quick Action Toolbar */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={{ flex: 1, minWidth: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }}
                onPress={() => {
                  setViewModalVisible(false);
                  handleCallLead(viewTargetLead);
                }}
              >
                <Feather name="phone" size={13} color="#16A34A" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#16A34A' }}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={{ flex: 1, minWidth: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }}
                onPress={() => {
                  setViewModalVisible(false);
                  openSendEmailModal(viewTargetLead);
                }}
              >
                <Feather name="mail" size={13} color="#0284C7" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284C7' }}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={{ flex: 1, minWidth: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: '#FAF5FF', borderColor: '#DDD6FE' }}
                onPress={() => {
                  setViewModalVisible(false);
                  openScheduleMeetingModal(viewTargetLead);
                }}
              >
                <Feather name="calendar" size={13} color="#7C3AED" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#7C3AED' }}>Meeting</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={{ flex: 1, minWidth: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}
                onPress={() => {
                  setViewModalVisible(false);
                  openEditLeadModal(viewTargetLead);
                }}
              >
                <Feather name="edit" size={13} color="#475569" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569' }}>Edit</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#0D9488', marginTop: 8, paddingVertical: 11 }]}
              onPress={() => setViewModalVisible(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Close Dossier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 13: Edit Task Modal ────────────────────────────────────────── */}
      <Modal
        visible={editTaskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLargeCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="edit-3" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                <Text style={styles.modalLargeTitle}>Edit Task</Text>
              </View>
              <TouchableOpacity onPress={() => setEditTaskModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Task Title *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Task title..."
                  placeholderTextColor="#94A3B8"
                  value={editTaskTitle}
                  onChangeText={setEditTaskTitle}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Description</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Task description / notes..."
                  placeholderTextColor="#94A3B8"
                  value={editTaskDescription}
                  onChangeText={setEditTaskDescription}
                  multiline
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Assignee</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsPicker}>
                  <TouchableOpacity
                    style={[styles.statusOptionPill, (!editTaskAssignee || editTaskAssignee === (effectiveUser?.id || effectiveUser?.user_id)) && styles.statusOptionPillActive]}
                    onPress={() => setEditTaskAssignee(effectiveUser?.id || effectiveUser?.user_id || '')}
                  >
                    <Text style={[styles.statusOptionText, (!editTaskAssignee || editTaskAssignee === (effectiveUser?.id || effectiveUser?.user_id)) && styles.statusOptionTextActive]}>
                      👤 Myself
                    </Text>
                  </TouchableOpacity>
                  {(assignableUsers || []).filter(u => u.id !== (effectiveUser?.id || effectiveUser?.user_id)).map((u) => {
                    const isSelected = editTaskAssignee === u.id;
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={[styles.statusOptionPill, isSelected && styles.statusOptionPillActive]}
                        onPress={() => setEditTaskAssignee(u.id)}
                      >
                        <Text style={[styles.statusOptionText, isSelected && styles.statusOptionTextActive]}>
                          {u.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'pending', label: '🕒 Pending' },
                    { key: 'in_progress', label: '⏳ In Progress' },
                    { key: 'completed', label: '✓ Completed' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.statusOptionPill, editTaskStatus === s.key && styles.statusOptionPillActive]}
                      onPress={() => setEditTaskStatus(s.key)}
                    >
                      <Text style={[styles.statusOptionText, editTaskStatus === s.key && styles.statusOptionTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Priority</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {['low', 'medium', 'high', 'urgent'].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.statusOptionPill, editTaskPriority === p && styles.statusOptionPillActive]}
                      onPress={() => setEditTaskPriority(p)}
                    >
                      <Text style={[styles.statusOptionText, editTaskPriority === p && styles.statusOptionTextActive]}>
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFieldLabel}>Due Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  value={editTaskDueDate}
                  onChangeText={setEditTaskDueDate}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalPrimaryBtn, { backgroundColor: '#0284C7' }]}
              onPress={handleSaveEditTaskSubmit}
              disabled={isSavingEditTask}
            >
              {isSavingEditTask ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Save Task Changes</Text>
              )}
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
  viewStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewQuickInfoBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewQuickInfoItem: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  viewSectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  viewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewNotesBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  viewNotesText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#92400E',
  },
  viewCommentCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  viewCommentBody: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 17,
    marginBottom: 6,
  },
  viewCommentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewCommentAuthor: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  viewCommentDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  viewEmptyBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewEmptyText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  viewAddCommentRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  viewAddCommentInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12.5,
    color: COLORS.textPrimary,
  },
  viewAddCommentBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewHistoryCard: {
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 4,
  },
  viewHistoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  viewHistoryTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewHistoryTypeLabel: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  viewHistoryDate: {
    fontSize: 10,
    color: '#64748B',
  },
  viewHistoryDesc: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 16,
  },
  viewHistoryAuthor: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
    fontStyle: 'italic',
  },
});
