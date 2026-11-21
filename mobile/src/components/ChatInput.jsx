import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function ChatInput({
  value,
  onChangeText,
  onSend,
  onAttach,
  onMicPress,
  isRecording = false,
}) {
  const handleKeyDown = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
      e.preventDefault?.();
      onSend();
    }
  };

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.pillContainer}>
        {/* Attachment Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.iconButton}
          onPress={onAttach}
        >
          <Feather name="paperclip" size={19} color="#64748B" />
        </TouchableOpacity>

        {/* Input Text Field */}
        <TextInput
          style={styles.textInput}
          placeholder="Ask anything or paste MOM notes..."
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          multiline={true}
          selectionColor={COLORS.brandEmerald}
          blurOnSubmit={false}
          returnKeyType="default"
          onKeyPress={handleKeyDown}
        />

        {/* Mic Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.iconButton}
          onPress={onMicPress}
        >
          <Feather
            name="mic"
            size={18}
            color={isRecording ? '#E11D48' : '#64748B'}
          />
        </TouchableOpacity>

        {/* Send Up Arrow Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.sendButton,
            { backgroundColor: value.trim().length > 0 ? COLORS.brandEmerald : COLORS.brandEmerald },
          ]}
          onPress={onSend}
        >
          <Feather name="arrow-up" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  iconButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: COLORS.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 38,
    maxHeight: 90,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.brandEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    shadowColor: COLORS.brandEmerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
