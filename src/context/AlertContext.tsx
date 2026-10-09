// src/context/AlertContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from './ThemeContext';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertConfig {
  title: string;
  message: string;
  type?: AlertType;
  buttonText?: string;
  onClose?: () => void;
}

export interface ConfirmConfig {
  title: string;
  message: string;
  type?: 'confirm' | 'warning' | 'error';
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface AlertContextValue {
  showAlert: (config: AlertConfig | string, message?: string, type?: AlertType) => void;
  showConfirm: (config: ConfirmConfig) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
}

const AlertContext = createContext<AlertContextValue>({
  showAlert: () => {},
  showConfirm: () => {},
  showSuccess: () => {},
  showError: () => {},
  showWarning: () => {},
});

// Global hook reference for non-component calls
let globalAlertDispatcher: AlertContextValue | null = null;

export const getGlobalAlert = (): AlertContextValue | null => globalAlertDispatcher;

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, isDark } = useAppTheme();

  const [visible, setVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'alert' | 'confirm'>('alert');
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: '',
    message: '',
    type: 'info',
  });
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Animation values
  const [scaleAnim] = useState(() => new Animated.Value(0.85));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  const runEnterAnimation = useCallback(() => {
    scaleAnim.setValue(0.88);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  const closeDialog = useCallback(() => {
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setIsConfirming(false);
    });
  }, [opacityAnim]);

  const showAlert = useCallback(
    (configOrTitle: AlertConfig | string, message?: string, type: AlertType = 'info') => {
      let cfg: AlertConfig;
      if (typeof configOrTitle === 'string') {
        cfg = {
          title: configOrTitle,
          message: message || '',
          type: type || 'info',
        };
      } else {
        cfg = configOrTitle;
      }

      setAlertConfig(cfg);
      setModalMode('alert');
      setVisible(true);
      runEnterAnimation();
    },
    [runEnterAnimation]
  );

  const showConfirm = useCallback(
    (config: ConfirmConfig) => {
      setConfirmConfig(config);
      setModalMode('confirm');
      setVisible(true);
      runEnterAnimation();
    },
    [runEnterAnimation]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => showAlert(title, message, 'success'),
    [showAlert]
  );

  const showError = useCallback(
    (title: string, message?: string) => showAlert(title, message, 'error'),
    [showAlert]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => showAlert(title, message, 'warning'),
    [showAlert]
  );

  const handleAlertClose = () => {
    closeDialog();
    if (alertConfig.onClose) {
      alertConfig.onClose();
    }
  };

  const handleConfirmCancel = () => {
    closeDialog();
    if (confirmConfig.onCancel) {
      confirmConfig.onCancel();
    }
  };

  const handleConfirmAction = async () => {
    try {
      setIsConfirming(true);
      const res = confirmConfig.onConfirm();
      if (res && typeof (res as any).then === 'function') {
        await res;
      }
      closeDialog();
    } catch {
      setIsConfirming(false);
      // Keep open or let error show
    }
  };

  const currentType = modalMode === 'alert' ? alertConfig.type || 'info' : confirmConfig.type || (confirmConfig.isDestructive ? 'error' : 'confirm');

  // Palette details based on type and dark mode
  const getTypeMeta = (): {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    border: string;
    btnBg: string;
  } => {
    switch (currentType) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: '#10b981',
          bg: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
          border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#a7f3d0',
          btnBg: '#059669',
        };
      case 'error':
        return {
          icon: 'close-circle',
          color: '#ef4444',
          bg: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fef2f2',
          border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
          btnBg: '#dc2626',
        };
      case 'warning':
        return {
          icon: 'warning',
          color: '#f59e0b',
          bg: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb',
          border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a',
          btnBg: '#d97706',
        };
      case 'confirm':
      case 'info':
      default:
        return {
          icon: modalMode === 'confirm' ? 'help-circle' : 'information-circle',
          color: colors.primary,
          bg: isDark ? 'rgba(2, 132, 199, 0.18)' : '#f0f9ff',
          border: isDark ? 'rgba(2, 132, 199, 0.35)' : '#bae6fd',
          btnBg: colors.primary,
        };
    }
  };

  const meta = getTypeMeta();

  const contextValue: AlertContextValue = useMemo(
    () => ({
      showAlert,
      showConfirm,
      showSuccess,
      showError,
      showWarning,
    }),
    [showAlert, showConfirm, showSuccess, showError, showWarning]
  );

  useEffect(() => {
    globalAlertDispatcher = contextValue;
  }, [contextValue]);

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          if (modalMode === 'alert') handleAlertClose();
          else handleConfirmCancel();
        }}
      >
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            activeOpacity={1}
            onPress={() => {
              if (modalMode === 'alert') handleAlertClose();
            }}
          />

          <Animated.View
            style={[
              styles.dialogCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Top Icon Badge */}
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: meta.bg, borderColor: meta.border },
              ]}
            >
              <Ionicons name={meta.icon} size={36} color={meta.color} />
            </View>

            {/* Title */}
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {modalMode === 'alert' ? alertConfig.title : confirmConfig.title}
            </Text>

            {/* Message */}
            {Boolean(modalMode === 'alert' ? alertConfig.message : confirmConfig.message) && (
              <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
                {modalMode === 'alert' ? alertConfig.message : confirmConfig.message}
              </Text>
            )}

            {/* Action Buttons */}
            {modalMode === 'alert' ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: meta.btnBg }]}
                onPress={handleAlertClose}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>
                  {alertConfig.buttonText || 'Understood'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.confirmBtnRow}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    {
                      backgroundColor: colors.surfaceHighlight,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleConfirmCancel}
                  activeOpacity={0.7}
                  disabled={isConfirming}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                    {confirmConfig.cancelText || 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor: confirmConfig.isDestructive ? '#dc2626' : colors.primary,
                    },
                  ]}
                  onPress={handleConfirmAction}
                  activeOpacity={0.8}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>
                      {confirmConfig.confirmText || 'Confirm'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
