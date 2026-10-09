// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_STORAGE_KEY = '@eventdesk_theme_mode_v1';

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceHighlight: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  card: string;
  inputBg: string;
  inputBorder: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  purple: string;
  purpleBg: string;
}

const lightTheme: ThemeColors = {
  isDark: false,
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceHighlight: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#0284c7',
  primaryLight: '#e0f2fe',
  card: '#ffffff',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
  success: '#059669',
  successBg: '#ecfdf5',
  warning: '#d97706',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
};

const darkTheme: ThemeColors = {
  isDark: true,
  background: '#090d16',
  surface: '#131b2e',
  surfaceHighlight: '#1e293b',
  border: '#243048',
  borderLight: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  primary: '#38bdf8',
  primaryLight: 'rgba(56, 189, 248, 0.15)',
  card: '#131b2e',
  inputBg: '#0f1726',
  inputBorder: '#2b3853',
  headerBg: '#0f1726',
  tabBarBg: '#0f1726',
  tabBarBorder: '#1e293b',
  success: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#f87171',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  purple: '#a78bfa',
  purpleBg: 'rgba(139, 92, 246, 0.15)',
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightTheme,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved !== null) {
          setIsDark(saved === 'dark');
        } else {
          setIsDark(systemScheme === 'dark');
        }
      } catch {}
    }
    loadTheme();
  }, [systemScheme]);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
  };

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
