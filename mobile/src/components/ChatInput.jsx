import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function ChatInput({
  value,
  onChangeText,
  onSend,
  onMicPress,
  isRecording = false,
  onFocus,
  onBlur,
}) {
  const handleKeyDown = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
      e.preventDefault?.();
      onSend && onSend();
    }
  };

  return (
    <View style={styles.outerWrapper}>
      <View style={[styles.pillContainer, isRecording && styles.pillContainerRecording]}>
        {/* Input Text Field */}
        <TextInput
          style={styles.textInput}
          placeholder={isRecording ? "Listening... Speak your command..." : "Ask anything or say a command..."}
          placeholderTextColor={isRecording ? '#059669' : '#94A3B8'}
          value={value}
          onChangeText={onChangeText}
          multiline={true}
          selectionColor={COLORS.brandEmerald}
          blurOnSubmit={false}
          returnKeyType="default"
          onKeyPress={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
        />

        {/* Voice Command Mic Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.micButton,
            isRecording && styles.micButtonRecording
          ]}
          onPress={onMicPress}
          accessibilityLabel="Voice Command"
        >
          <Feather
            name="mic"
            size={18}
            color={isRecording ? '#FFFFFF' : '#059669'}
          />
        </TouchableOpacity>

        {/* Send Up Arrow Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.sendButton,
            { backgroundColor: value && value.trim().length > 0 ? COLORS.brandEmerald : COLORS.brandEmerald },
          ]}
          onPress={() => onSend && onSend()}
          accessibilityLabel="Send Message"
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
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: COLORS.bgMain,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  pillContainerRecording: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: COLORS.textPrimary,
    paddingRight: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 38,
    maxHeight: 90,
    textAlignVertical: 'center',
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  micButtonRecording: {
    backgroundColor: '#E11D48',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.brandEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandEmerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
