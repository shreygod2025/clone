import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function BottomTabBar({ activeTab, onTabChange }) {
  const tabs = [
    {
      id: 'field_visit',
      label: 'Field Visit',
      iconSet: 'Ionicons',
      iconName: 'location-outline',
    },
    {
      id: 'ai_chat',
      label: 'AI Chat',
      iconSet: 'Ionicons',
      iconName: 'chatbubbles',
    },
    {
      id: 'my_space',
      label: 'My Space',
      iconSet: 'Feather',
      iconName: 'check-square',
    },
    {
      id: 'schools',
      label: 'School CRM',
      iconSet: 'Ionicons',
      iconName: 'school-outline',
    },
  ];

  const renderIcon = (tab, isActive) => {
    const color = isActive ? COLORS.tabActive : COLORS.tabInactive;
    const size = isActive ? 21 : 19;

    if (tab.id === 'field_visit') {
      return (
        <Ionicons
          name={isActive ? 'location' : 'location-outline'}
          size={size}
          color={color}
        />
      );
    }

    if (tab.id === 'ai_chat') {
      return (
        <Ionicons
          name={isActive ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
          size={size}
          color={color}
        />
      );
    }

    if (tab.id === 'schools') {
      return (
        <Ionicons
          name={isActive ? 'school' : 'school-outline'}
          size={size}
          color={color}
        />
      );
    }

    if (tab.iconSet === 'Feather') {
      return <Feather name={tab.iconName} size={size} color={color} />;
    }
    return <Ionicons name={tab.iconName} size={size} color={color} />;
  };

  return (
    <View style={styles.tabBarContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.7}
            style={styles.tabItem}
            onPress={() => onTabChange(tab.id)}
          >
            {renderIcon(tab, isActive)}
            <Text
              style={[
                styles.tabLabel,
                isActive ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.tabBorder,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  tabLabelActive: {
    fontWeight: '800',
    color: COLORS.tabActive,
  },
  tabLabelInactive: {
    fontWeight: '500',
    color: COLORS.tabInactive,
  },
});
