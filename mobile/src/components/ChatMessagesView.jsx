import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Keyboard, Platform, Linking, Alert } from 'react-native';
import { Feather, Ionicons, FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import MarkdownView from './MarkdownView';

// Helper to sanitize and format assistant notes, stripping any legacy extraction boilerplate
function formatAssistantNote(notes, leadCard) {
  if (!notes) {
    return `Lead recorded for ${leadCard?.schoolName || leadCard?.school_name || 'the school'}. Demonstration and customized curriculum quote requested.`;
  }
  let clean = notes
    .replace(/Extracted & auto-logged by OLL Agentic AI Assistant from:.*?["']\.\.\./gi, '')
    .replace(/Extracted & auto-logged by OLL Agentic AI Assistant from:.*?(?:\.|$)/gi, '')
    .replace(/Extracted & auto-logged.*?(?:\.|$)/gi, '')
    .trim();
  if (!clean || clean.length < 5) {
    clean = `Lead recorded for ${leadCard?.schoolName || leadCard?.school_name || 'the school'}. Follow-up scheduled by AI Assistant with ${leadCard?.contactPerson || leadCard?.contact_name || 'Principal'}.`;
  }
  return clean;
}

export default function ChatMessagesView({
  messages,
  isTyping,
  onActionChipPress,
  onEditLead,
  onSendEmail,
  onSendWhatsApp,
  onGenerateProposal,
  onCallLead,
  onMeetingDone,
  onScheduleMeeting,
  onRaiseTicket,
  onFollowup,
  onDocs,
  onAssign,
  onNote,
  onDeleteLead,
  onLostLead,
  onArchiveLead,
}) {
  const scrollViewRef = useRef(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  // Auto-scroll when virtual keyboard appears on mobile
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    return () => showSub.remove();
  }, []);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {messages.map((msg, index) => (
        <View key={index} style={styles.messageRow}>
          {msg.sender === 'user' ? (
            /* User Message Bubble */
            <View style={styles.userBubbleContainer}>
              <View style={styles.userBubble}>
                <MarkdownView content={msg.text} baseStyle={styles.userText} isUser={true} />
              </View>
              <Text style={styles.timestamp}>{msg.time || 'Just now'}</Text>
            </View>
          ) : (
            /* AI Assistant Message */
            <View style={styles.aiMessageContainer}>
              {/* AI Avatar & Header */}
              <View style={styles.aiHeader}>
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>OLL</Text>
                </View>
                <View>
                  <View style={styles.aiNameRow}>
                    <Text style={styles.aiName}>OLL CRM AI</Text>
                    <View style={styles.agenticBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.agenticText}>GPT-5</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* AI Bubble Body */}
              <View style={styles.aiBubble}>
                <MarkdownView content={msg.text} baseStyle={styles.aiText} isUser={false} />

                {/* Render Rich Lead Card if present */}
                {msg.leadCard && (() => {
                  const lead = msg.leadCard;
                  const isDeleted = lead.status === 'deleted' || lead.isDeleted || lead.status === 'archived';
                  const isLost = lead.status === 'lost';
                  const isMeetingDone = lead.status === 'meeting_done';
                  const isMeetingScheduled = !isMeetingDone && (lead.status === 'meeting_scheduled' || Boolean(lead.meeting_date));

                  return (
                    <View style={styles.leadCardContainer}>
                      <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Ionicons name="school" size={17} color={isLost ? '#EF4444' : isDeleted ? '#64748B' : '#059669'} style={{ marginRight: 6 }} />
                          <Text style={styles.schoolName} numberOfLines={1}>{lead.schoolName || lead.school_name}</Text>
                        </View>
                      </View>

                      <View style={styles.badgeRow}>
                        {isLost ? (
                          <View style={[styles.boardBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', borderWidth: 1 }]}>
                            <Text style={[styles.boardBadgeText, { color: '#B91C1C', fontWeight: '800' }]}>❌ LOST LEAD (CLOSED)</Text>
                          </View>
                        ) : isDeleted ? (
                          <View style={[styles.boardBadge, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderWidth: 1 }]}>
                            <Text style={[styles.boardBadgeText, { color: '#64748B', fontWeight: '800' }]}>🗑️ DELETED FROM CRM</Text>
                          </View>
                        ) : isMeetingDone ? (
                          <View style={[styles.boardBadge, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE', borderWidth: 1 }]}>
                            <Text style={[styles.boardBadgeText, { color: '#7C3AED', fontWeight: '800' }]}>✓ MEETING DONE</Text>
                          </View>
                        ) : isMeetingScheduled ? (
                          <View style={[styles.boardBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1 }]}>
                            <Text style={[styles.boardBadgeText, { color: '#1D4ED8', fontWeight: '800' }]}>📅 MEETING SCHEDULED</Text>
                          </View>
                        ) : (
                          <View style={styles.boardBadge}>
                            <Text style={styles.boardBadgeText}>{lead.board || 'CBSE'}</Text>
                          </View>
                        )}

                        <View style={styles.scoreBadge}>
                          <Text style={styles.scoreBadgeText}>{lead.leadScore || (isLost ? '0/100 (Closed)' : '96/100 (Hot Lead)')}</Text>
                        </View>
                        {lead.id ? (
                          <View style={styles.dbIdBadge}>
                            <Text style={styles.dbIdText}>ID: {lead.id.substring(0, 8)}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.infoRow}>
                        <Feather name="map-pin" size={14} color="#64748B" />
                        <Text style={styles.infoText}>{lead.location || 'Mumbai, Maharashtra'}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Feather name="user" size={14} color="#64748B" />
                        <Text style={styles.infoText}>{lead.contactPerson || lead.contact_name}</Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.infoRow}
                        onPress={() => {
                          if (isLost) {
                            Alert.alert('Lead Closed (Lost)', 'This lead is marked as Lost. Communication is disabled.');
                            return;
                          }
                          if (isDeleted) {
                            Alert.alert('Lead Deleted', 'This lead has been deleted from CRM.');
                            return;
                          }
                          onSendEmail && onSendEmail(lead);
                        }}
                      >
                        <Feather name="mail" size={14} color="#E11D48" />
                        <Text style={[styles.infoText, { color: '#E11D48' }]}>
                          {lead.email || 'pending@school.edu.in'} <Text style={{ fontSize: 11, color: '#94A3B8' }}>(Tap to Email)</Text>
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.infoRow}
                        onPress={() => {
                          if (isLost) {
                            Alert.alert('Lead Closed (Lost)', 'This lead is marked as Lost. Communication is disabled.');
                            return;
                          }
                          if (isDeleted) {
                            Alert.alert('Lead Deleted', 'This lead has been deleted from CRM.');
                            return;
                          }
                          onCallLead && onCallLead(lead);
                        }}
                      >
                        <Feather name="phone" size={14} color="#059669" />
                        <Text style={[styles.infoText, { color: '#059669', fontWeight: '600' }]}>
                          {lead.phone} <Text style={{ fontSize: 11, color: '#94A3B8' }}>(Tap to Call)</Text>
                        </Text>
                      </TouchableOpacity>

                      {/* Clean Assistant Latest Note */}
                      <View style={styles.latestNoteCard}>
                        <View style={styles.noteTitleRow}>
                          <View style={styles.noteAiPill}>
                            <Ionicons name="sparkles" size={10} color="#065F46" />
                            <Text style={styles.noteAiPillText}>Assistant</Text>
                          </View>
                          <Text style={styles.latestNoteTitle}>Latest Note:</Text>
                        </View>
                        <MarkdownView
                          content={formatAssistantNote(lead.notes, lead)}
                          baseStyle={styles.latestNoteBody}
                        />
                      </View>

                      {/* Automated Follow-up Tasks from Backend */}
                      {lead.followup_tasks && lead.followup_tasks.length > 0 ? (
                        <View style={styles.followupTasksBox}>
                          <Text style={styles.followupBoxTitle}>Auto-Scheduled Follow-up Reminders:</Text>
                          {lead.followup_tasks.slice(0, 4).map((task, idx) => (
                            <View key={idx} style={styles.taskMiniRow}>
                              <Feather name="calendar" size={12} color="#059669" style={{ marginRight: 6 }} />
                              <Text style={styles.taskMiniText}>
                                Step {task.number}: {task.email_type} scheduled for {task.scheduled_date}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {/* Interactive Lead Action Buttons or Locked State */}
                      {isLost ? (
                        <View style={styles.leadLostBanner}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Feather name="slash" size={13} color="#DC2626" style={{ marginRight: 6 }} />
                            <Text style={styles.leadLostTitle}>Lost Lead — Closed Permanently</Text>
                          </View>
                          <Text style={styles.leadLostDescription}>
                            This school has been recorded as a Lost Lead. Per CRM rules, no meetings, proposals, notes, or edits can be performed.
                          </Text>
                        </View>
                      ) : isDeleted ? (
                        <View style={styles.leadDeletedBanner}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Feather name="trash-2" size={13} color="#64748B" style={{ marginRight: 6 }} />
                            <Text style={styles.leadDeletedTitle}>Lead Deleted from CRM</Text>
                          </View>
                          <Text style={styles.leadDeletedDescription}>
                            This record was deleted from the active database. Editing and further actions are disabled.
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.leadActionsBar}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnEditLead]}
                            onPress={() => onEditLead && onEditLead(lead)}
                          >
                            <Feather name="edit-2" size={11} color="#0284C7" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#0284C7' }]}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnProposal]}
                            onPress={() => onGenerateProposal && onGenerateProposal(lead)}
                          >
                            <Feather name="file-text" size={11} color="#D97706" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#D97706' }]}>Proposal</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[
                              styles.leadActionButton,
                              isMeetingDone ? { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' } : styles.btnMeetingDone,
                            ]}
                            onPress={() => onMeetingDone && onMeetingDone(lead)}
                          >
                            <View style={isMeetingDone ? styles.tinyGreenDot : styles.tinyPurpleDot} />
                            <Text
                              style={[
                                styles.leadActionText,
                                { color: isMeetingDone ? '#059669' : '#7C3AED', fontWeight: isMeetingDone ? '700' : '600' },
                              ]}
                            >
                              {isMeetingDone ? 'Meeting Done ✓' : 'Meeting Done'}
                            </Text>
                          </TouchableOpacity>

                          {/* Schedule Meeting: Rule 2 & 3 */}
                          {isMeetingScheduled ? (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={[styles.leadActionButton, styles.btnMeetingLocked]}
                              onPress={() => onScheduleMeeting && onScheduleMeeting(lead)}
                            >
                              <Feather name="lock" size={11} color="#64748B" style={{ marginRight: 3 }} />
                              <Text style={[styles.leadActionText, { color: '#64748B' }]}>Meeting Scheduled (Locked)</Text>
                            </TouchableOpacity>
                          ) : isMeetingDone ? (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={[styles.leadActionButton, styles.btnScheduleMeeting]}
                              onPress={() => onScheduleMeeting && onScheduleMeeting(lead)}
                            >
                              <Feather name="calendar" size={11} color="#2563EB" style={{ marginRight: 3 }} />
                              <Text style={[styles.leadActionText, { color: '#2563EB', fontWeight: '700' }]}>
                                Schedule 2nd Meeting
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={[styles.leadActionButton, styles.btnScheduleMeeting]}
                              onPress={() => onScheduleMeeting && onScheduleMeeting(lead)}
                            >
                              <Feather name="calendar" size={11} color="#2563EB" style={{ marginRight: 3 }} />
                              <Text style={[styles.leadActionText, { color: '#2563EB' }]}>Schedule Meeting</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnTicket]}
                            onPress={() => onRaiseTicket && onRaiseTicket(lead)}
                          >
                            <Ionicons name="ticket-outline" size={11} color="#EA580C" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#EA580C' }]}>Ticket</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnFollowup]}
                            onPress={() => onFollowup && onFollowup(lead)}
                          >
                            <Feather name="phone-call" size={11} color="#0D9488" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#0D9488' }]}>Followup</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnDocs]}
                            onPress={() => onDocs && onDocs(lead)}
                          >
                            <Feather name="file-text" size={11} color="#0891B2" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#0891B2' }]}>Docs</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnMail]}
                            onPress={() => onSendEmail && onSendEmail(lead)}
                          >
                            <Feather name="mail" size={11} color="#0284C7" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#0284C7' }]}>Mail</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnWa]}
                            onPress={() => onSendWhatsApp && onSendWhatsApp(lead)}
                          >
                            <FontAwesome name="whatsapp" size={13} color="#16A34A" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#16A34A' }]}>WhatsApp</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnAssign]}
                            onPress={() => onAssign && onAssign(lead)}
                          >
                            <Feather name="user-plus" size={11} color="#4F46E5" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#4F46E5' }]}>Assign</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnNote]}
                            onPress={() => onNote && onNote(lead)}
                          >
                            <Feather name="edit-3" size={11} color="#475569" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#475569' }]}>Note</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnDelete]}
                            onPress={() => onDeleteLead && onDeleteLead(lead)}
                          >
                            <Feather name="trash-2" size={11} color="#DC2626" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#DC2626' }]}>Delete</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnLostLead]}
                            onPress={() => onLostLead && onLostLead(lead)}
                          >
                            <Feather name="x" size={11} color="#E11D48" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#E11D48' }]}>Lost Lead</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.leadActionButton, styles.btnArchive]}
                            onPress={() => onArchiveLead && onArchiveLead(lead)}
                          >
                            <Feather name="archive" size={11} color="#64748B" style={{ marginRight: 3 }} />
                            <Text style={[styles.leadActionText, { color: '#64748B' }]}>Archive</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Render Follow-up Pipeline List if present */}
                {msg.followUpList && (
                  <View style={styles.pipelineContainer}>
                    {msg.followUpList.map((item, idx) => (
                      <View key={idx} style={styles.pipelineItem}>
                        <View style={styles.pipeTopRow}>
                          <Text style={styles.pipeSchool}>{item.name}</Text>
                          <View style={styles.urgencyTag}>
                            <Text style={styles.urgencyText}>{item.urgency}</Text>
                          </View>
                        </View>
                        <Text style={styles.pipeCampus}>{item.campus} • Value: {item.value}</Text>
                        <Text style={styles.pipeTask}>👉 {item.task}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Render Proposal Card if present */}
                {msg.proposal && (
                  <View style={styles.proposalContainer}>
                    <Text style={styles.proposalTitle}>{msg.proposal.title}</Text>
                    <Text style={styles.proposalTier}>{msg.proposal.tier}</Text>
                    <View style={styles.divider} />
                    {msg.proposal.modules.map((mod, i) => (
                      <Text key={i} style={styles.moduleItem}>✓ {mod}</Text>
                    ))}
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>{msg.proposal.pricing}</Text>
                    </View>
                  </View>
                )}

                {/* Render Active Schools List if present */}
                {msg.activeSchools && (
                  <View style={styles.schoolsListContainer}>
                    {msg.activeSchools.map((sch, i) => (
                      <View key={i} style={styles.schoolItemRow}>
                        <View style={styles.schoolBullet} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.schoolItemName}>{sch.name}</Text>
                          <Text style={styles.schoolItemDetail}>{sch.tier} • {sch.students} students</Text>
                        </View>
                        <View style={styles.statusPillSmall}>
                          <Text style={styles.statusPillSmallText}>{sch.status}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Render Intro Email if present */}
                {msg.email && (
                  <View style={styles.emailContainer}>
                    <Text style={styles.emailSubject}>Subject: {msg.email.subject}</Text>
                    <Text style={styles.emailTo}>To: {msg.email.recipient}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.emailBody}>{msg.email.body}</Text>
                  </View>
                )}

                {/* Render Action Chips (hidden when leadCard is shown to avoid duplicate buttons) */}
                {!msg.leadCard && msg.nextActions && msg.nextActions.length > 0 && (
                  <View style={styles.chipsRow}>
                    {msg.nextActions.map((chip, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        style={styles.chipButton}
                        onPress={() => onActionChipPress && onActionChipPress(chip)}
                      >
                        <Feather name="chevron-right" size={13} color={COLORS.brandEmerald} style={{ marginRight: 3 }} />
                        <Text style={styles.chipText}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.aiAvatarSmall}>
            <Text style={styles.aiAvatarSmallText}>OLL</Text>
          </View>
          <View style={styles.typingBubble}>
            <TypingDots />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnim = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -5,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(400),
        ])
      );
    };

    const a1 = createAnim(dot1, 0);
    const a2 = createAnim(dot2, 200);
    const a3 = createAnim(dot3, 400);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  messageRow: {
    marginBottom: 16,
  },
  userBubbleContainer: {
    alignItems: 'flex-end',
  },
  userBubble: {
    backgroundColor: COLORS.brandEmerald,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    shadowColor: COLORS.brandEmerald,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginRight: 4,
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.brandMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiAvatarText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.brandDark,
    fontStyle: 'italic',
  },
  aiNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  agenticBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.brandGreen,
    marginRight: 4,
  },
  agenticText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  aiText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  leadCardContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  schoolName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 10,
  },
  boardBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  boardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  scoreBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  dbIdBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dbIdText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  latestNoteCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteAiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  noteAiPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  latestNoteTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
  },
  latestNoteBody: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#1E293B',
  },
  followupTasksBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
  },
  followupBoxTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  taskMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  taskMiniText: {
    fontSize: 11,
    color: '#334155',
  },
  leadActionsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  leadActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  emailBtn: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  waBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  callBtn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  proposalBtn: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  btnEditLead: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  btnProposal: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  btnEditProposal: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  btnMeetingDone: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  tinyPurpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
    marginRight: 4,
  },
  btnScheduleMeeting: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  btnTicket: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  btnFollowup: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  btnDocs: {
    backgroundColor: '#ECFEFF',
    borderColor: '#A5F3FC',
  },
  btnMail: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  btnWa: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  btnAssign: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  btnNote: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  btnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  btnLostLead: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F43F5E',
  },
  btnArchive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#94A3B8',
  },
  leadActionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  tinyGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 4,
  },
  btnMeetingLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  leadLostBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  leadLostTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  leadLostDescription: {
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 15,
  },
  leadDeletedBanner: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  leadDeletedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  leadDeletedDescription: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  pipelineContainer: {
    marginTop: 8,
  },
  pipelineItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  pipeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pipeSchool: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  urgencyTag: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  pipeCampus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pipeTask: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '500',
    marginTop: 6,
  },
  proposalContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  proposalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  proposalTier: {
    fontSize: 12.5,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  moduleItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  priceContainer: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  priceText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#065F46',
  },
  schoolsListContainer: {
    marginTop: 6,
  },
  schoolItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  schoolBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
    marginRight: 10,
  },
  schoolItemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  schoolItemDetail: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  statusPillSmall: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  emailContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  emailSubject: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emailTo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emailBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandEmerald,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  aiAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: COLORS.brandMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiAvatarSmallText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.brandDark,
    fontStyle: 'italic',
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 36,
    justifyContent: 'space-between',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
});
