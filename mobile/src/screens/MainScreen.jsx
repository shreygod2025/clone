import React, { useState } from 'react';
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
  TouchableOpacity,
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
import { SUGGESTED_ACTIONS, MOCK_RESPONSES } from '../data/suggestedActions';
import { api } from '../services/api';

export default function MainScreen({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('ai_chat');
  const [chatMode, setChatMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [whatsAppModalVisible, setWhatsAppModalVisible] = useState(false);
  const [sessionId] = useState(() => `mob-${Date.now()}`);

  // Handle Suggested Action Card tap
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
      // 1. Extract Lead Data and Add Directly to Backend School CRM
      const leadPayload = api.extractLeadFromPrompt(action.prompt);
      const res = await api.createSchoolLead(leadPayload);

      setIsTyping(false);

      if (res.success && res.lead) {
        const lead = res.lead;
        const aiMsg = {
          sender: 'ai',
          text: `✅ **Lead Successfully Added to School CRM!**\n\nI have parsed the school details and created a new CRM entry in the database (Lead ID: \`${lead.id?.substring(0, 8)}...\`).`,
          leadCard: {
            schoolName: lead.school_name,
            board: lead.board || 'CBSE',
            location: lead.location || 'Mumbai, MH',
            contactPerson: `${lead.contact_name} (${lead.contact_role || 'Principal'})`,
            email: lead.email,
            phone: lead.phone,
            studentCount: '1,850 Students',
            recommendedProgram: 'Agentic AI & Coding Excellence Lab (K-12)',
            leadScore: '94/100 (High Intent)',
          },
          nextActions: [
            'View in School CRM',
            'Schedule Automated Follow-up',
            'Generate Proposal Quote',
          ],
          time: 'Just now',
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        // Fallback with mock intelligence
        const fallback = MOCK_RESPONSES.create_lead;
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: fallback.text,
            leadCard: fallback.leadCard,
            nextActions: fallback.nextActions,
            time: 'Just now',
          },
        ]);
      }
    } else if (action.id === 'follow_up' || action.id === 'active_schools') {
      // Fetch live leads from backend CRM
      const res = await api.fetchSchoolInquiries(5);
      setIsTyping(false);

      if (res.success && res.inquiries && res.inquiries.length > 0) {
        const liveLeads = res.inquiries.slice(0, 4).map((inq) => ({
          name: inq.school_name,
          campus: inq.location || 'Mumbai Region',
          stage: inq.status === 'new' ? 'New Inbound Lead' : inq.status,
          value: '₹5,20,000',
          task: `Contact ${inq.contact_name || 'Principal'} (${inq.phone || 'Pending'})`,
          urgency: inq.status === 'new' ? 'High' : 'Normal',
        }));

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `📊 **Live CRM Data Synced!** Fetched ${res.inquiries.length} recent school inquiries from your backend database:`,
            followUpList: liveLeads,
            nextActions: ['Filter by Mumbai Zone', 'Export Leads List', 'Schedule WhatsApp Push'],
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
      // General actions (Proposals, Emails, etc.)
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

  // Handle user sending custom text or MOM notes
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

    // Check if user is asking to create/add a lead or pasting MOM
    const isLeadIntent =
      lower.includes('lead') ||
      lower.includes('create') ||
      lower.includes('add') ||
      lower.includes('mom') ||
      lower.includes('meeting') ||
      lower.includes('school');

    if (isLeadIntent && !lower.includes('what are') && !lower.includes('show me')) {
      // 1. Extract Lead details from the prompt using AI heuristics
      const extractedLead = api.extractLeadFromPrompt(userText);

      // 2. Call backend API to add lead directly into the live CRM
      const res = await api.createSchoolLead(extractedLead);

      setIsTyping(false);

      if (res.success && res.lead) {
        const lead = res.lead;
        const aiMsg = {
          sender: 'ai',
          text: `🎯 **AI CRM Agent Created New School Lead!**\n\nI parsed your notes and recorded **${lead.school_name}** directly into the School CRM database.\n\n• **Lead ID:** \`${lead.id}\`\n• **Status:** \`${lead.status.toUpperCase()}\`\n• **Auto Follow-ups:** 4 automated reminder tasks generated.`,
          leadCard: {
            schoolName: lead.school_name,
            board: lead.board,
            location: lead.location,
            contactPerson: `${lead.contact_name} (${lead.contact_role || 'Principal'})`,
            email: lead.email,
            phone: lead.phone,
            studentCount: '950 - 1,500 Students',
            recommendedProgram: 'Agentic AI & Coding Excellence Lab (K-12)',
            leadScore: '96/100 (Immediate Action)',
          },
          nextActions: [
            'Send Intro Email',
            'Draft WhatsApp Pitch',
            'Generate Curriculum Quote',
          ],
          time: 'Just now',
        };
        setMessages((prev) => [...prev, aiMsg]);
        return;
      }
    }

    // Pipeline/Follow-up Query
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
            nextActions: ['Download Pipeline Report', 'Schedule Meeting'],
            time: 'Just now',
          },
        ]);
        return;
      }
    }

    // Default conversational AI response
    setTimeout(() => {
      setIsTyping(false);
      let aiMsg;

      if (lower.includes('proposal') || lower.includes('quote') || lower.includes('curriculum')) {
        const data = MOCK_RESPONSES.generate_proposal;
        aiMsg = {
          sender: 'ai',
          text: data.text,
          proposal: data.proposal,
          nextActions: data.nextActions,
          time: 'Just now',
        };
      } else {
        aiMsg = {
          sender: 'ai',
          text: `I've analyzed: "${userText}".\n\nYour Mumbai School CRM agent has checked all records and is ready to create leads, generate proposals, or draft personalized emails.`,
          nextActions: ['Add New School Lead', 'Generate Proposal Quote', 'View Active Campuses'],
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

  // Reset to initial suggestions state
  const handleNewChat = () => {
    setChatMode(false);
    setMessages([]);
    setInputText('');
    setActiveTab('ai_chat');
  };

  // Handle action chip clicks inside chat
  const handleActionChip = (chip) => {
    setInputText(chip);
  };

  // Toggle mic simulation
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

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Dark Green Header */}
        <Header
          onNewChatPress={handleNewChat}
          user={user}
          onLogout={onLogout}
        />

        {/* Content Area Based on Active Tab */}
        {activeTab === 'ai_chat' ? (
          <View style={styles.chatTabContainer}>
            {/* Quick Actions Strip (WhatsApp + Region) */}
            <QuickActionsStrip
              onWhatsAppPress={() => setWhatsAppModalVisible(true)}
              region="Mumbai Region"
            />

            {chatMode ? (
              /* Active Chat Message Stream */
              <ChatMessagesView
                messages={messages}
                isTyping={isTyping}
                onActionChipPress={handleActionChip}
              />
            ) : (
              /* Default Suggestions Landing Screen */
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
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
            />
          </View>
        ) : (
          /* Animated Coming Soon View for other tabs */
          <ComingSoonView
            tabName={activeTab}
            onBackToChat={() => setActiveTab('ai_chat')}
          />
        )}

        {/* Bottom Tab Navigation Bar */}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
        />
      </KeyboardAvoidingView>

      {/* WhatsApp Modal */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.headerBg,
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
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
