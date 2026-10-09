// src/app/(tabs)/_layout.tsx
import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { AppLoader } from '@/components/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { responsiveFontSize, moderateScale } from '@/theme/responsive';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, isSuperAdmin, can } = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return <AppLoader message="Loading Workspace..." />;
  }

  if (!user) {
    return null;
  }

  const hasRegister = can('can_register');
  const hasRecords = can('can_view_records');
  const hasScanner = can('can_scan');
  const hasAnalytics = can('can_view_analytics');

  const bottomInset = Math.max(insets.bottom, 8);
  const tabHeight = moderateScale(54) + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: moderateScale(6),
        },
        tabBarLabelStyle: {
          fontSize: responsiveFontSize(11),
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Register',
          href: hasRegister ? '/(tabs)' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Directory',
          href: hasRecords ? '/(tabs)/records' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          href: hasScanner ? '/(tabs)/scanner' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          href: hasAnalytics ? '/(tabs)/analytics' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isSuperAdmin ? '/(tabs)/admin' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
