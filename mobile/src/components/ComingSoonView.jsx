import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function ComingSoonView({ tabName, onBackToChat }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );

    // Floating animation
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, [pulseAnim, floatAnim]);

  const getTabConfig = () => {
    switch (tabName) {
      case 'dashboard':
        return {
          title: 'Executive Dashboard',
          subtitle: 'Live School Conversion Funnels, Revenue Forecasts, and Outreach Analytics are coming in the next update.',
          icon: 'bar-chart-2',
          iconSet: 'Feather',
          colors: ['#065F46', '#059669', '#34D399'],
        };
      case 'my_space':
        return {
          title: 'My Space & Tasks',
          subtitle: 'Your personalized school meeting scheduler, follow-up checklist, and daily agentic action items.',
          icon: 'check-square',
          iconSet: 'Feather',
          colors: ['#1E3A8A', '#2563EB', '#60A5FA'],
        };
      case 'schools':
        return {
          title: 'Schools Directory',
          subtitle: 'Campus directory, tier allocations, student enrollment rosters, and curriculum contract management.',
          icon: 'trophy',
          iconSet: 'Ionicons',
          colors: ['#78350F', '#D97706', '#FBBF24'],
        };
      default:
        return {
          title: 'Coming Soon',
          subtitle: 'This feature is being crafted with Agentic AI precision.',
          icon: 'clock',
          iconSet: 'Feather',
          colors: ['#065F46', '#059669', '#34D399'],
        };
    }
  };

  const config = getTabConfig();

  return (
    <View style={styles.container}>
      {/* Animated Glowing Center Badge */}
      <Animated.View
        style={[
          styles.badgeWrapper,
          {
            transform: [{ translateY: floatAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glowAura,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <LinearGradient
          colors={config.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCircle}
        >
          {config.iconSet === 'Ionicons' ? (
            <Ionicons name={config.icon} size={42} color="#FFFFFF" />
          ) : (
            <Feather name={config.icon} size={40} color="#FFFFFF" />
          )}
        </LinearGradient>
      </Animated.View>

      {/* Status Pill */}
      <View style={styles.statusPill}>
        <View style={styles.miniDot} />
        <Text style={styles.statusPillText}>IN ACTIVE DEVELOPMENT</Text>
      </View>

      {/* Main Title & Description */}
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.subtitle}>{config.subtitle}</Text>

      {/* Interactive Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.backButton}
          onPress={onBackToChat}
        >
          <Feather name="message-square" size={17} color="#FFFFFF" style={styles.btnIcon} />
          <Text style={styles.backButtonText}>Return to AI Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: COLORS.bgMain,
  },
  badgeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  glowAura: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
  },
  gradientCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '85%',
    backgroundColor: COLORS.brandEmerald,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: COLORS.brandEmerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnIcon: {
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
