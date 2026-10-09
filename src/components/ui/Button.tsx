// src/components/ui/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { metrics, responsiveFontSize, moderateScale } from '@/theme/responsive';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<Props> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  rightIcon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  size = 'md',
}) => {
  const { colors } = useAppTheme();

  const getVariantStyles = (): { bg: string; text: string; border?: string } => {
    switch (variant) {
      case 'secondary':
        return {
          bg: colors.surfaceHighlight,
          text: colors.text,
          border: colors.border,
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: colors.primary,
          border: colors.primary,
        };
      case 'danger':
        return {
          bg: '#dc2626',
          text: '#ffffff',
        };
      case 'ghost':
        return {
          bg: 'transparent',
          text: colors.textSecondary,
        };
      case 'primary':
      default:
        return {
          bg: colors.primary,
          text: '#ffffff',
        };
    }
  };

  const vStyle = getVariantStyles();

  const height =
    size === 'sm'
      ? moderateScale(38)
      : size === 'lg'
      ? moderateScale(52)
      : metrics.touchTarget;

  const fontSize =
    size === 'sm'
      ? responsiveFontSize(12)
      : size === 'lg'
      ? responsiveFontSize(16)
      : responsiveFontSize(14);

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: vStyle.bg,
          borderColor: vStyle.border || 'transparent',
          borderWidth: vStyle.border ? 1 : 0,
          height,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={vStyle.text} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={moderateScale(18)}
              color={vStyle.text}
              style={styles.icon}
            />
          )}
          <Text style={[styles.text, { color: vStyle.text, fontSize }, textStyle]}>
            {title}
          </Text>
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={moderateScale(18)}
              color={vStyle.text}
              style={styles.rightIcon}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: metrics.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: metrics.spacing.md,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  icon: {
    marginRight: moderateScale(6),
  },
  rightIcon: {
    marginLeft: moderateScale(6),
  },
  disabled: {
    opacity: 0.55,
  },
});
