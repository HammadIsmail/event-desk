// src/app/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { responsiveFontSize, moderateScale, metrics } from '@/theme/responsive';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { colors, isDark, toggleTheme } = useAppTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!username.trim()) {
      setErrorMsg('Please enter your username');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await login(username, password);
      if (res.success) {
        router.replace('/(tabs)');
      } else {
        setErrorMsg(res.error || 'Authentication failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 12) + moderateScale(8);
  const bottomPadding = Math.max(insets.bottom, 16) + moderateScale(10);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding, paddingBottom: bottomPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={moderateScale(18)} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconBox,
                {
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                },
              ]}
            >
              <Image
                source={require('../../assets/images/icon.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Society of Chemical Engineers</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Official Society Event Desk
            </Text>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>USERNAME</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter username"
                  placeholderTextColor={colors.textMuted}
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    setErrorMsg('');
                  }}
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>PASSWORD</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setErrorMsg('');
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={17} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Professional Developer Credit Footer without Department Name */}
        <View style={styles.footerCreditsContainer}>
          <Text style={[styles.developedByText, { color: colors.textMuted }]}>
            Engineered & Developed by <Text style={[styles.authorName, { color: colors.text }]}>Hammad</Text>
          </Text>

          <TouchableOpacity
            style={[styles.emailPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => Linking.openURL('mailto:hammadismail807@gmail.com')}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={13} color={colors.primary} />
            <Text style={[styles.emailText, { color: colors.primary }]}>
              hammadismail807@gmail.com
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: metrics.spacing.md,
  },
  topBar: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: moderateScale(12),
  },
  themeBtn: {
    width: moderateScale(42),
    height: moderateScale(42),
    minWidth: metrics.minTouchTarget,
    minHeight: metrics.minTouchTarget,
    borderRadius: metrics.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: metrics.radius.xl,
    width: '100%',
    maxWidth: 420,
    padding: moderateScale(22),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: moderateScale(20),
  },
  iconBox: {
    width: moderateScale(68),
    height: moderateScale(68),
    borderRadius: metrics.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(12),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  title: {
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: responsiveFontSize(12),
    marginTop: moderateScale(4),
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: moderateScale(10),
    borderRadius: metrics.radius.md,
    marginBottom: moderateScale(14),
  },
  errorText: {
    color: '#dc2626',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    flex: 1,
  },
  form: {
    gap: moderateScale(14),
  },
  inputGroup: {
    gap: moderateScale(5),
  },
  label: {
    fontSize: responsiveFontSize(10),
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: metrics.radius.md,
    paddingHorizontal: metrics.spacing.md,
    minHeight: metrics.minTouchTarget,
    height: moderateScale(48),
  },
  inputIcon: {
    marginRight: moderateScale(8),
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: responsiveFontSize(14),
  },
  eyeBtn: {
    padding: moderateScale(8),
    minWidth: moderateScale(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtn: {
    backgroundColor: '#0284c7',
    minHeight: metrics.minTouchTarget,
    height: moderateScale(48),
    borderRadius: metrics.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8),
    marginTop: moderateScale(6),
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
  },
  footerCreditsContainer: {
    marginTop: moderateScale(22),
    alignItems: 'center',
    gap: moderateScale(8),
  },
  developedByText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '500',
  },
  authorName: {
    fontWeight: '800',
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    paddingHorizontal: metrics.spacing.md,
    paddingVertical: moderateScale(6),
    borderRadius: metrics.radius.full,
    borderWidth: 1,
  },
  emailText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '700',
  },
});
