import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('it@oll.co');
  const [password, setPassword] = useState('it@oll.co');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both admin email and password');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await api.login(email.trim(), password.trim());
      setLoading(false);

      if (result.success) {
        onLoginSuccess(result.user, result.token);
      } else {
        setErrorMessage(result.error || 'Invalid credentials or server unavailable');
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'An unexpected error occurred during login');
    }
  };

  const handleQuickFill = () => {
    setEmail('it@oll.co');
    setPassword('it@oll.co');
    setErrorMessage('');
  };

  const handleDemoMode = () => {
    const demoUser = {
      id: 'demo-admin-id',
      email: 'it@oll.co',
      name: 'Mehak Shaikh',
      role: 'admin',
      permissions: ['schools', 'dashboard', 'ai_chat'],
    };
    onLoginSuccess(demoUser, 'demo-token');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Status Bar Placeholder for Mobile */}
        <View style={styles.statusBarRow}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.statusIconsRow}>
            <Ionicons name="cellular" size={14} color="#FFFFFF" style={styles.statusIcon} />
            <Ionicons name="wifi" size={14} color="#FFFFFF" style={styles.statusIcon} />
            <Ionicons name="battery-full" size={18} color="#FFFFFF" />
          </View>
        </View>

        {/* Brand Header */}
        <View style={styles.headerSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>OLL</Text>
          </View>
          <Text style={styles.appTitle}>OLL CRM</Text>
          <View style={styles.agenticPill}>
            <View style={styles.liveDot} />
            <Text style={styles.agenticPillText}>Admin Portal • GPT-5 Live</Text>
          </View>
          <Text style={styles.subtitle}>
            Sign in to access your School CRM, live pipeline leads & agentic actions.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Administrator Sign In</Text>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Admin Email</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="it@oll.co"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Fill Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.quickFillButton}
            onPress={handleQuickFill}
          >
            <Feather name="zap" size={14} color={COLORS.brandEmerald} style={{ marginRight: 4 }} />
            <Text style={styles.quickFillText}>Auto-fill Live Admin (it@oll.co)</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.submitButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#064E3B', '#047857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Sign In to AI CRM</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Demo Bypass Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.demoModeButton}
            onPress={handleDemoMode}
          >
            <Text style={styles.demoModeText}>Explore in Demo Mode →</Text>
          </TouchableOpacity>
        </View>

        {/* Server & Backend Indicator */}
        <View style={styles.serverStatusFooter}>
          <View style={styles.serverDot} />
          <Text style={styles.serverText} numberOfLines={1}>
            Backend: <Text style={{ fontWeight: '700' }}>{api.getBackendUrl()}</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.headerBg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: 16,
  },
  statusTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.brandMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COLORS.brandMint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.brandDark,
    fontStyle: 'italic',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  agenticPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 229, 163, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 229, 163, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandGreen,
    marginRight: 6,
  },
  agenticPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.brandMint,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#A7F3D0',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    color: '#B91C1C',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eyeButton: {
    padding: 6,
  },
  quickFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  quickFillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandEmerald,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.brandEmerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  demoModeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  demoModeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  serverStatusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  serverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  serverText: {
    fontSize: 11.5,
    color: '#A7F3D0',
  },
});
