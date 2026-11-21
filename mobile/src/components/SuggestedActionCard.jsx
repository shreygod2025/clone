import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function SuggestedActionCard({ action, onPress }) {
  const renderIcon = () => {
    switch (action.id) {
      case 'follow_up':
        return <Feather name="users" size={19} color={action.iconColor} />;
      case 'create_lead':
        return <Feather name="plus-circle" size={20} color={action.iconColor} />;
      case 'generate_proposal':
        return <Feather name="file-text" size={19} color={action.iconColor} />;
      case 'active_schools':
        return <Ionicons name="school" size={18} color={action.iconColor} />;
      case 'send_intro_email':
        return <Ionicons name="paper-plane" size={18} color={action.iconColor} />;
      default:
        return <Feather name="activity" size={18} color={COLORS.textSecondary} />;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.cardContainer}
      onPress={() => onPress(action)}
    >
      {/* Tinted Icon Squircle */}
      <View style={[styles.iconContainer, { backgroundColor: action.iconBg }]}>
        {renderIcon()}
      </View>

      {/* Middle Text Info */}
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {action.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {action.subtitle}
        </Text>
      </View>

      {/* Right External Link Icon */}
      <View style={styles.actionIconWrapper}>
        <Feather name="external-link" size={17} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  actionIconWrapper: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
