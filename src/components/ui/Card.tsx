// src/components/ui/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { metrics } from '@/theme/responsive';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'surface' | 'highlight';
}

export const Card: React.FC<Props> = ({ children, style, variant = 'surface' }) => {
  const { colors } = useAppTheme();

  const bg = variant === 'highlight' ? colors.surfaceHighlight : colors.surface;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: metrics.radius.lg,
    padding: metrics.spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
});
