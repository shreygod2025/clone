import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function WelcomeSection() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth, gentle floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <View style={styles.container}>
      {/* Centered Logo with Clean, Polished Green Shadow & Halo Frame */}
      <Animated.View style={[styles.iconWrapper, { transform: [{ translateY: floatAnim }] }]}>
        {/* Layer 1: Soft diffuse green drop-shadow */}
        <View style={styles.softGreenGlow} />

        {/* Layer 2: Translucent Emerald Halo Frame (matches design screenshot) */}
        <View style={styles.haloFrame} />

        {/* Layer 3: Central Gradient Squircle with Sparkles/Wand Icon */}
        <View style={styles.squircleShadow}>
          <LinearGradient
            colors={['#1E40AF', '#0284C7', '#0D9488', '#10B981']}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.95, y: 0.95 }}
            style={styles.gradientSquircle}
          >
            <Ionicons name="sparkles" size={32} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Main Title */}
      <Text style={styles.title}>OLL CRM AI Assistant</Text>

      {/* Subtitle Description */}
      <Text style={styles.subtitle}>
        I can manage your School CRM — create leads,{'\n'}
        send emails, generate proposals, and more.
      </Text>

      {/* Suggested Actions Section Header */}
      <View style={styles.suggestedHeaderRow}>
        <Text style={styles.suggestedActionsLabel}>SUGGESTED ACTIONS</Text>
        <View style={styles.tapToRunRow}>
          <Feather name="zap" size={13} color={COLORS.whatsAppGreen} style={styles.zapIcon} />
          <Text style={styles.tapToRunText}>Tap to run</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bgMain,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: 82,
    height: 82,
  },

  /* Soft, smooth green glow right behind the logo */
  softGreenGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: 'rgba(56, 229, 163, 0.35)',
    ...(Platform.OS === 'web'
      ? {
          filter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(34, 197, 94, 0.45)',
        }
      : {
          shadowColor: '#10B981',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 14,
          elevation: 8,
        }),
  },

  /* Clean outer rounded halo frame matching the screenshot */
  haloFrame: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: 'rgba(56, 229, 163, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 229, 163, 0.55)',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 0 12px rgba(56, 229, 163, 0.35)',
        }
      : {
          shadowColor: '#22C55E',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 4,
        }),
  },

  /* Elevated squircle container */
  squircleShadow: {
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 6px 14px rgba(6, 78, 59, 0.25)',
        }
      : {}),
  },

  gradientSquircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  suggestedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 26,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  suggestedActionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
  },
  tapToRunRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zapIcon: {
    marginRight: 4,
  },
  tapToRunText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.whatsAppGreen,
  },
});
