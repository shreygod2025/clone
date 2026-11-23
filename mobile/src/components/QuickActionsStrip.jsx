import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function QuickActionsStrip({ region = 'Mumbai Region' }) {
  return (
    <View style={styles.container}>
      {/* Region Indicator */}
      <View style={styles.regionContainer}>
        <Ionicons name="business-outline" size={14} color={COLORS.textSecondary} style={styles.buildingIcon} />
        <Text style={styles.regionText}>{region}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: COLORS.bgMain,
  },
  regionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  buildingIcon: {
    marginRight: 4,
  },
  regionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
