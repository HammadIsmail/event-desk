// src/components/ui/Screen.tsx
import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { metrics } from '@/theme/responsive';

interface Props {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  keyboardOffset?: number;
}

export const Screen: React.FC<Props> = ({
  children,
  scrollable = true,
  contentContainerStyle,
  style,
  keyboardOffset = Platform.OS === 'ios' ? 64 : 0,
}) => {
  const { colors } = useAppTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerConstrained}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.fixedContent, contentContainerStyle]}>
          <View style={styles.centerConstrained}>{children}</View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: metrics.spacing.md,
    paddingBottom: metrics.spacing.xl,
  },
  fixedContent: {
    flex: 1,
    paddingHorizontal: metrics.spacing.md,
  },
  centerConstrained: {
    width: '100%',
    maxWidth: metrics.maxContainerWidth,
    alignSelf: 'center',
  },
});
