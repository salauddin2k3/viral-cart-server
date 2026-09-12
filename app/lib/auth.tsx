'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from './api';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'moderator';
  status: 'active' | 'deactivated';
  mustChangePassword: boolean;
  permissions: string[];
}

interface AuthContextValue {
  user: StaffUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canCreateRole: (targetRole: 'moderator') => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          const u = data.user;
          setUser({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            mustChangePassword: u.mustChangePassword,
            permissions: Array.isArray(u.permissions) ? u.permissions : [],
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (email: string, password: string) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
    const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message ?? 'Login failed');
    }
    await checkSession();
  }, [checkSession]);

  const logout = useCallback(async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
    await fetch(`${API_BASE}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
    const res = await fetch(`${API_BASE}/api/admin/staff/self-change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? 'Password change failed');
    }
    await checkSession();
  }, [checkSession]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions.includes(permission);
  }, [user]);

  const canCreateRole = useCallback((_targetRole: 'moderator'): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, hasPermission, canCreateRole, refreshSession: checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
