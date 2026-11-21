import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function Header({ onNewChatPress }) {
  // Gentle pulse animation for the "Live" indicator dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.headerWrapper}>
      {/* Phone Status Bar (9:41, Signal, Wifi, Battery) matching the design */}
      <View style={styles.statusBarRow}>
        <Text style={styles.statusTime}>9:41</Text>
        <View style={styles.statusIconsRow}>
          <Ionicons name="cellular" size={14} color="#FFFFFF" style={styles.statusIcon} />
          <Ionicons name="wifi" size={14} color="#FFFFFF" style={styles.statusIcon} />
          <Ionicons name="battery-full" size={18} color="#FFFFFF" />
        </View>
      </View>

      {/* Main Navigation Bar */}
      <View style={styles.navBarRow}>
        {/* Left side: Logo + Brand + Status */}
        <View style={styles.brandRow}>
          {/* OLL Logo Badge */}
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>OLL</Text>
          </View>

          {/* Text Details */}
          <View style={styles.titleColumn}>
            <View style={styles.nameAndBadgeRow}>
              <Text style={styles.brandName}>OLL CRM</Text>
              <View style={styles.gptBadge}>
                <Text style={styles.gptBadgeText}>GPT-5</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
              <Text style={styles.statusText}>Agentic AI Live</Text>
            </View>
          </View>
        </View>

        {/* Right side: + New Chat button & User Avatar */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.newChatButton}
            onPress={onNewChatPress}
          >
            <Feather name="plus" size={14} color={COLORS.brandMint} style={styles.plusIcon} />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>YL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: 4,
  },
  statusTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  statusIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  navBarRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.brandMint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandMint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.brandDark,
    letterSpacing: -0.5,
    fontStyle: 'italic',
  },
  titleColumn: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  nameAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textWhite,
    letterSpacing: 0.2,
  },
  gptBadge: {
    backgroundColor: 'rgba(15, 92, 70, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(56, 229, 163, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  gptBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.brandMint,
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  statusDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: COLORS.brandGreen,
    marginRight: 6,
    shadowColor: COLORS.brandGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.liveGreen,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.headerSubtle,
    borderWidth: 1,
    borderColor: 'rgba(56, 229, 163, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  plusIcon: {
    marginRight: 3,
  },
  newChatText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.headerSubtle,
    borderWidth: 1,
    borderColor: 'rgba(56, 229, 163, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandMint,
  },
});
