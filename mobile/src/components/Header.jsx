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
            </View>

            <View style={styles.statusRow}>
              <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
              <Text style={styles.statusText}>Agentic AI Live</Text>
            </View>
          </View>
        </View>

        {/* Right side: + New Chat button, User Avatar & Logout */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.newChatButton}
            onPress={onNewChatPress}
          >
            <Feather name="plus" size={13} color={COLORS.brandMint} style={styles.plusIcon} />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.avatarCircle}
            onPress={() => setProfileModalVisible(true)}
          >
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.headerLogoutBtn}
            onPress={onLogout}
            accessibilityLabel="Sign Out"
          >
            <Feather name="log-out" size={13} color="#F87171" />
            <Text style={styles.headerLogoutText}>Logout</Text>
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
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 12 : (Platform.OS === 'ios' ? 10 : 14),
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    marginRight: 6,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.brandMint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandMint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.brandDark,
    letterSpacing: -0.5,
    fontStyle: 'italic',
  },
  titleColumn: {
    marginLeft: 8,
    justifyContent: 'center',
    flexShrink: 1,
  },
  nameAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textWhite,
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandGreen,
    marginRight: 5,
    shadowColor: COLORS.brandGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.liveGreen,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.headerSubtle,
    borderWidth: 1,
    borderColor: 'rgba(56, 229, 163, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  plusIcon: {
    marginRight: 2,
  },
  newChatText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.headerSubtle,
    borderWidth: 1,
    borderColor: 'rgba(56, 229, 163, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandMint,
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 14,
  },
  headerLogoutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
    marginLeft: 3,
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
