// src/components/PaymentBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PaymentStatus } from '@/types';

interface Props {
  status: PaymentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const PaymentBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const getColors = () => {
    switch (status) {
      case 'PAID':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
      case 'PARTIAL':
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
      case 'FREE':
        return { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' };
      case 'UNPAID':
      default:
        return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    }
  };

  const colors = getColors();
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingVertical: isSm ? 2 : isLg ? 6 : 4,
          paddingHorizontal: isSm ? 6 : isLg ? 12 : 8,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: isSm ? 10 : isLg ? 13 : 11,
          },
        ]}
      >
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
