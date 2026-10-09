// src/components/AppLoader.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing, ActivityIndicator } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

interface Props {
  message?: string;
}

export const AppLoader: React.FC<Props> = ({ message = 'Loading System...' }) => {
  const { colors, isDark } = useAppTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Subtle gentle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Logo Card with subtle border and shadow */}
        <View
          style={[
            styles.logoContainer,
            {
              backgroundColor: '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
            },
          ]}
        >
          <Image
            source={require('@/../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Society of Chemical Engineers
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Official Event Desk
        </Text>

        <View style={styles.loaderRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          {message ? (
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>
              {message}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
