// src/app/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { AppLoader } from '@/components/AppLoader';

export default function IndexScreen() {
  const { user, isLoading, can, isSuperAdmin } = useAuth();

  if (isLoading) {
    return <AppLoader message="Opening Event Desk..." />;
  }

  if (user) {
    if (can('can_register')) return <Redirect href="/(tabs)" />;
    if (can('can_view_records')) return <Redirect href="/(tabs)/records" />;
    if (can('can_scan')) return <Redirect href="/(tabs)/scanner" />;
    if (can('can_view_analytics')) return <Redirect href="/(tabs)/analytics" />;
    if (isSuperAdmin) return <Redirect href="/(tabs)/admin" />;
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
