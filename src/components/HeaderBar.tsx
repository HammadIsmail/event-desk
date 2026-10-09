import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { sqliteStore } from '@/services/sqliteStore';
import { responsiveFontSize, moderateScale } from '@/theme/responsive';

interface Props {
  title?: string;
  subtitle?: string;
  onSyncComplete?: () => void;
}

export const HeaderBar: React.FC<Props> = ({
  title = 'Society of Chemical Engineers',
  subtitle,
  onSyncComplete,
}) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { showSuccess, showWarning, showConfirm } = useAlert();
  const [syncing, setSyncing] = useState(false);

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 20 : 12) + moderateScale(6);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await sqliteStore.syncWithCloud();
      showSuccess(
        'Cloud Sync Successful',
        `SQLite & Supabase synchronized!\n• Uploaded to Cloud: ${res.uploaded} records\n• Downloaded from Cloud: ${res.downloaded} items`
      );
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      showWarning(
        'Sync Notice',
        'Could not reach Cloud. Data remains safely stored locally in SQLite.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleLogoutPress = () => {
    showConfirm({
      title: 'Sign Out',
      message: `Are you sure you want to sign out from @${user?.username || 'account'}?`,
      confirmText: 'Sign Out',
      isDestructive: true,
      onConfirm: async () => {
        await logout();
      },
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.borderLight,
          paddingTop: topPadding,
        },
      ]}
    >
      <View style={styles.left}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        {/* Sync Button */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surfaceHighlight }]}
          onPress={handleSync}
          disabled={syncing}
          activeOpacity={0.7}
          accessibilityLabel="Sync with Cloud"
        >
          {syncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="sync-outline" size={18} color={colors.primary} />
          )}
        </TouchableOpacity>

        {/* Dark Mode Toggle */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surfaceHighlight }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
          accessibilityLabel="Toggle Theme"
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={colors.text}
          />
        </TouchableOpacity>

        {/* Logout */}
        {user && (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={handleLogoutPress}
            activeOpacity={0.7}
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: moderateScale(16),
    paddingBottom: moderateScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  left: {
    flex: 1,
    marginRight: moderateScale(10),
    justifyContent: 'center',
  },
  title: {
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: responsiveFontSize(12),
    fontWeight: '500',
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  iconBtn: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
