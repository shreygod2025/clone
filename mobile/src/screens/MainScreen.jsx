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
import { Feather, FontAwesome } from '@expo/vector-icons';
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

export default function MainScreen() {
  const [activeTab, setActiveTab] = useState('ai_chat');
  const [chatMode, setChatMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [whatsAppModalVisible, setWhatsAppModalVisible] = useState(false);

  // Switch to chat mode with an AI response
  const handleActionCardPress = (action) => {
    setChatMode(true);
    const userMsg = {
      sender: 'user',
      text: action.prompt,
      time: 'Just now',
    };

    setMessages([userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const mockData = MOCK_RESPONSES[action.id] || {
        text: `Here is the agentic summary for "${action.title}". Everything has been processed and synced with your Mumbai school pipeline.`,
        nextActions: ['View Detailed Logs', 'Sync to CRM'],
      };

      const aiMsg = {
        sender: 'ai',
        text: mockData.text,
        leadCard: mockData.leadCard,
        followUpList: mockData.data,
        proposal: mockData.proposal,
        activeSchools: mockData.schools,
        email: mockData.email,
        nextActions: mockData.nextActions,
        time: 'Just now',
      };

      setMessages((prev) => [...prev, aiMsg]);
    }, 1200);
  };

  // Handle user sending custom text
  const handleSend = () => {
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

    setTimeout(() => {
      setIsTyping(false);
      let aiMsg;

      // Intelligent matching for CRM queries
      const lower = userText.toLowerCase();
      if (lower.includes('lead') || lower.includes('create') || lower.includes('abc')) {
        const data = MOCK_RESPONSES.create_lead;
        aiMsg = {
          sender: 'ai',
          text: data.text,
          leadCard: data.leadCard,
          nextActions: data.nextActions,
          time: 'Just now',
        };
      } else if (lower.includes('follow') || lower.includes('pipeline') || lower.includes('pending')) {
        const data = MOCK_RESPONSES.follow_up;
        aiMsg = {
          sender: 'ai',
          text: data.text,
          followUpList: data.data,
          nextActions: data.nextActions,
          time: 'Just now',
        };
      } else if (lower.includes('proposal') || lower.includes('quote') || lower.includes('curriculum')) {
        const data = MOCK_RESPONSES.generate_proposal;
        aiMsg = {
          sender: 'ai',
          text: data.text,
          proposal: data.proposal,
          nextActions: data.nextActions,
          time: 'Just now',
        };
      } else if (lower.includes('mom') || lower.includes('meeting') || lower.includes('minute')) {
        aiMsg = {
          sender: 'ai',
          text: '📝 **MOM Analysis Complete:** Extracted 1 New Lead, 2 Follow-up Items & 1 Timeline:',
          leadCard: {
            schoolName: 'St. Mary’s Convent High School',
            board: 'ICSE',
            location: 'Mazgaon, Mumbai',
            contactPerson: 'Sister Teresa / Academic Coordinator Mr. Roy',
            email: 'admin@stmarys-mumbai.edu.in',
            phone: '+91 98192 33410',
            studentCount: '950 Students',
            recommendedProgram: 'AI Coding & Techfest Track',
            leadScore: '92/100 (Immediate Interest)',
          },
          nextActions: ['Save Lead to CRM', 'Draft Proposal Quote', 'Schedule Demo Session'],
          time: 'Just now',
        };
      } else {
        aiMsg = {
          sender: 'ai',
          text: `I've analyzed your request: "${userText}".\n\nYour Mumbai CRM agent is reviewing school records, lead timelines, and pending communications. Would you like me to generate an official proposal or draft an email?`,
          nextActions: ['Generate Proposal', 'Create School Lead', 'View Follow-ups'],
          time: 'Just now',
        };
      }

      setMessages((prev) => [...prev, aiMsg]);
    }, 1100);
  };

  // Sample MOM insertion for ProTip or Attachment
  const handlePasteSampleMom = () => {
    setInputText(
      'MOM: Met with Principal Mrs. Kapoor at St. Mary’s Convent Mumbai. Interested in AI curriculum for 950 students. Contact: +91 98192 33410. Action: Send quote by Friday.'
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
      setInputText('Transcribing voice note for Mumbai leads...');
      setTimeout(() => {
        setIsRecording(false);
      }, 2000);
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
        <Header onNewChatPress={handleNewChat} />

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
