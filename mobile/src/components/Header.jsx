import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Modal } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function Header({ onNewChatPress, user, onLogout }) {
  const [profileModalVisible, setProfileModalVisible] = useState(false);
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

  const getInitials = () => {
    if (!user || !user.name) return 'YL';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.headerWrapper}>
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

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.avatarCircle}
            onPress={() => setProfileModalVisible(true)}
          >
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* User Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setProfileModalVisible(false)}
        >
          <View style={styles.profileCard}>
            <View style={styles.profileAvatarLarge}>
              <Text style={styles.profileAvatarTextLarge}>{getInitials()}</Text>
            </View>
            <Text style={styles.profileName}>{user?.name || 'Administrator'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'it@oll.co'}</Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {(user?.role || 'admin').toUpperCase()}
              </Text>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.8}
              onPress={() => {
                setProfileModalVisible(false);
                onLogout && onLogout();
              }}
            >
              <Feather name="log-out" size={16} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  navBarRow: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : (Platform.OS === 'ios' ? 12 : 18),
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  profileCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  profileAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileAvatarTextLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.brandMint,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});
