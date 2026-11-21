import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';

export default function ProTipBanner({ onPasteSampleMom }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.tipCard}
      onPress={onPasteSampleMom}
    >
      <Text style={styles.bulbIcon}>💡</Text>
      <Text style={styles.tipText}>
        <Text style={styles.tipBold}>Pro Tip: </Text>
        Paste Minutes of Meeting (MOM) directly in the chat to auto-generate school leads, action items, and timelines.
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.proTipBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  bulbIcon: {
    fontSize: 15,
    marginRight: 8,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#334155',
  },
  tipBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
});
