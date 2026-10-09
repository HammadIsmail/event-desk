// src/components/SelectDropdown.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { responsiveFontSize, moderateScale, metrics } from '@/theme/responsive';

export interface DropdownOption {
  label: string;
  value: string;
  subLabel?: string;
}

interface Props {
  label: string;
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
}

export const SelectDropdown: React.FC<Props> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select option',
}) => {
  const { colors } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          <Text
            style={[
              styles.triggerText,
              { color: selectedOption ? colors.text : colors.textMuted },
            ]}
            numberOfLines={1}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          {selectedOption?.subLabel && (
            <Text style={[styles.triggerSub, { color: colors.primary }]}>
              {selectedOption.subLabel}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={moderateScale(18)} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceHighlight }]}
              >
                <Ionicons name="close" size={moderateScale(18)} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: isSelected
                          ? colors.primaryLight
                          : 'transparent',
                        borderBottomColor: colors.borderLight,
                      },
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      setModalVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.subLabel && (
                        <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                          {item.subLabel}
                        </Text>
                      )}
                    </View>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={moderateScale(20)} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: moderateScale(6),
  },
  label: {
    fontSize: responsiveFontSize(10),
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  trigger: {
    minHeight: metrics.minTouchTarget,
    height: moderateScale(48),
    borderRadius: metrics.radius.md,
    borderWidth: 1,
    paddingHorizontal: metrics.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  triggerText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
  },
  triggerSub: {
    fontSize: responsiveFontSize(11),
    fontWeight: '800',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: metrics.radius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: metrics.spacing.lg,
  },
  modalCard: {
    borderRadius: metrics.radius.lg,
    width: '100%',
    maxWidth: 440,
    maxHeight: '75%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: metrics.spacing.lg,
    paddingVertical: metrics.spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: moderateScale(6),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: metrics.spacing.lg,
    paddingVertical: metrics.spacing.md,
    minHeight: metrics.minTouchTarget,
    borderBottomWidth: 1,
  },
  optionLabel: {
    fontSize: responsiveFontSize(14),
  },
  optionSub: {
    fontSize: responsiveFontSize(11),
    marginTop: moderateScale(2),
  },
});
