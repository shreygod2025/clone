import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function ChatMessagesView({ messages, isTyping, onActionChipPress }) {
  const scrollViewRef = useRef(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((msg, index) => (
        <View key={index} style={styles.messageRow}>
          {msg.sender === 'user' ? (
            /* User Message Bubble */
            <View style={styles.userBubbleContainer}>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{msg.text}</Text>
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
                <Text style={styles.aiText}>{msg.text}</Text>

                {/* Render Rich Lead Card if present */}
                {msg.leadCard && (
                  <View style={styles.leadCardContainer}>
                    <View style={styles.cardHeader}>
                      <FontAwesome5 name="school" size={16} color="#059669" />
                      <Text style={styles.schoolName}>{msg.leadCard.schoolName}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <View style={styles.boardBadge}>
                        <Text style={styles.boardBadgeText}>{msg.leadCard.board}</Text>
                      </View>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreBadgeText}>{msg.leadCard.leadScore}</Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Feather name="map-pin" size={14} color="#64748B" />
                      <Text style={styles.infoText}>{msg.leadCard.location}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Feather name="user" size={14} color="#64748B" />
                      <Text style={styles.infoText}>{msg.leadCard.contactPerson}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Feather name="mail" size={14} color="#64748B" />
                      <Text style={styles.infoText}>{msg.leadCard.email}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Feather name="phone" size={14} color="#64748B" />
                      <Text style={styles.infoText}>{msg.leadCard.phone}</Text>
                    </View>
                  </View>
                )}

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

                {/* Render Action Chips */}
                {msg.nextActions && msg.nextActions.length > 0 && (
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
    borderRadius: 14,
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
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  boardBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  boardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  scoreBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
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
