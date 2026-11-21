import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function QuickActionsStrip({ onWhatsAppPress, region = 'Mumbai Region' }) {
  return (
    <View style={styles.container}>
      {/* Connect WhatsApp Pill Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.whatsAppPill}
        onPress={onWhatsAppPress}
      >
        <FontAwesome name="whatsapp" size={17} color={COLORS.whatsAppGreen} style={styles.waIcon} />
        <Text style={styles.whatsAppText}>Connect WhatsApp</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.whatsAppGreen} />
      </TouchableOpacity>

      {/* Region Indicator */}
      <View style={styles.regionContainer}>
        <Ionicons name="business-outline" size={15} color={COLORS.textSecondary} style={styles.buildingIcon} />
        <Text style={styles.regionText}>{region}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bgMain,
  },
  whatsAppPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: COLORS.whatsAppBorder,
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 7,
    shadowColor: COLORS.whatsAppGreen,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  waIcon: {
    marginRight: 6,
  },
  whatsAppText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.whatsAppText,
    marginRight: 4,
  },
  regionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buildingIcon: {
    marginRight: 4,
  },
  regionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
