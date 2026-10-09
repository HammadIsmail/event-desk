// src/components/ui/Input.tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { metrics, responsiveFontSize, moderateScale } from '@/theme/responsive';

interface Props extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  error?: string;
  prefix?: string;
}

export const Input: React.FC<Props> = ({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  error,
  prefix,
  style,
  ...props
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.group}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: colors.inputBg,
            borderColor: error ? '#dc2626' : colors.inputBorder,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={moderateScale(18)}
            color={colors.textMuted}
            style={styles.icon}
          />
        )}

        {prefix && (
          <Text style={[styles.prefix, { color: colors.primary }]}>{prefix}</Text>
        )}

        <TextInput
          style={[styles.input, { color: colors.text }, style]}
          placeholderTextColor={colors.textMuted}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={rightIcon}
              size={moderateScale(18)}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: moderateScale(6),
    marginBottom: moderateScale(12),
  },
  label: {
    fontSize: responsiveFontSize(11),
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: metrics.radius.md,
    paddingHorizontal: metrics.spacing.md,
    minHeight: metrics.touchTarget,
  },
  icon: {
    marginRight: moderateScale(8),
  },
  prefix: {
    fontSize: responsiveFontSize(14),
    fontWeight: '800',
    marginRight: moderateScale(6),
  },
  input: {
    flex: 1,
    height: metrics.touchTarget,
    fontSize: responsiveFontSize(14),
    paddingVertical: 0,
  },
  rightIconBtn: {
    padding: moderateScale(6),
  },
  errorText: {
    color: '#dc2626',
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
    marginTop: 2,
  },
});
