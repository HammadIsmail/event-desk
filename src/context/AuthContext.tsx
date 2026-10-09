// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppUser, ModeratorPermissions, DEFAULT_MODERATOR_PERMISSIONS } from '@/types';
import { dataStore } from '@/services/dataStore';

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  login: (username: string, passwordPlain: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  isModerator: boolean;
  can: (action: keyof ModeratorPermissions) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  isSuperAdmin: false,
  isModerator: false,
  can: () => false,
});

const AUTH_STORAGE_KEY = '@eventdesk_active_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSavedSession() {
      try {
        await dataStore.init();
        const saved = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setUser(parsed);
        }
      } catch (err) {
        console.warn('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSavedSession();
  }, []);

  const login = async (username: string, passwordPlain: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const authenticatedUser = await dataStore.authenticateUser(username, passwordPlain);
      if (!authenticatedUser) {
        return { success: false, error: 'Invalid username or password' };
      }
      if (!authenticatedUser.is_active) {
        return { success: false, error: 'Your account is deactivated. Contact Super Admin.' };
      }

      setUser(authenticatedUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication error' };
    }
  };

  const logout = async () => {
    if (user) {
      await dataStore.logAudit({
        action: 'LOGOUT',
        entity_type: 'auth',
        performed_by_id: user.id,
        performed_by_username: user.username,
      });
    }
    setUser(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const can = (action: keyof ModeratorPermissions): boolean => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    if (user.permissions && typeof user.permissions[action] === 'boolean') {
      return user.permissions[action];
    }
    return DEFAULT_MODERATOR_PERMISSIONS[action] ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isSuperAdmin: user?.role === 'superadmin',
        isModerator: user?.role === 'moderator',
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
