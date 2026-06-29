import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import {
  login as apiLogin,
  logout as apiLogout,
  customerLogin as apiCustomerLogin,
  customerSignup as apiCustomerSignup,
  getMe,
  ApiError,
} from '../api';
import type { ProfileItem } from '../api/types';
import { clearAccessToken, clearRefreshToken } from '../api/config';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  customerLogin: (mobile: string, password: string, tenantId?: number) => Promise<boolean>;
  customerSignup: (
    name: string,
    mobile: string,
    password: string,
    email?: string,
    tenantId?: number
  ) => Promise<boolean>;
  establishSession: (user: User) => void;
  clearSession: () => void;
  logout: () => void;
  forgotPassword: (email: string) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ROLE_MAP: Record<number, User['role']> = {
  1: 'super_admin',
  2: 'tenant_owner',
  3: 'manager',
  4: 'cashier',
};

const ROLE_NAME_MAP: Record<string, User['role']> = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
};

function userFromStaffProfile(email: string, profile?: ProfileItem): User {
  const roleName = profile?.role_name?.toUpperCase();
  const role = (roleName && ROLE_NAME_MAP[roleName]) || 'tenant_owner';
  const displayName =
    role === 'super_admin'
      ? profile?.email?.split('@')[0] ?? 'Super Admin'
      : profile?.tenant_name ?? profile?.display_name ?? email.split('@')[0] ?? 'User';
  return {
    id: profile?.id != null ? String(profile.id) : '',
    email: profile?.email ?? email,
    name: displayName,
    role,
    tenantId: profile?.tenant_id != null ? String(profile.tenant_id) : undefined,
  };
}

export function buildStaffUserFromProfile(email: string, profile?: ProfileItem): User {
  return userFromStaffProfile(email, profile);
}

function userFromLoginResponse(email: string, data?: { user?: { id: number; email: string; role_id?: number; tenant_id?: number } }): User {
  const u = data?.user;
  const roleId = u?.role_id ?? 0;
  const emailLower = email.toLowerCase();
  const role =
    ROLE_MAP[roleId] ??
    (emailLower.includes('super_admin') || emailLower.startsWith('super') ? 'super_admin' : 'cashier');
  return {
    id: String(u?.id ?? ''),
    email: u?.email ?? email,
    name: email.split('@')[0] ?? 'User',
    role,
    tenantId: u?.tenant_id != null ? String(u.tenant_id) : undefined,
  };
}

function userFromCustomerAuth(data: {
  id: number;
  name: string;
  mobile?: string | null;
  email?: string | null;
  tenant_id: number;
}): User {
  return {
    id: String(data.id),
    email: data.email ?? data.mobile ?? '',
    name: data.name,
    role: 'customer',
    tenantId: String(data.tenant_id),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('gamehub_user');
    const token = sessionStorage.getItem('gamehub_access_token');
    if (stored && token) return JSON.parse(stored) as User;
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('gamehub_access_token');
    const stored = sessionStorage.getItem('gamehub_user');
    if (!token || !stored) return;
    try {
      const parsed = JSON.parse(stored) as User;
      if (parsed.role === 'customer') return;
      getMe()
        .then((profile) => {
          if (!profile.data) return;
          const refreshed = buildStaffUserFromProfile(parsed.email, profile.data);
          setUser(refreshed);
          sessionStorage.setItem('gamehub_user', JSON.stringify(refreshed));
        })
        .catch(() => {});
    } catch {
      // ignore invalid session
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await apiLogin({ email, password });
      let u = userFromLoginResponse(email);
      try {
        const profile = await getMe();
        if (profile.data) {
          u = buildStaffUserFromProfile(email, profile.data);
        }
      } catch {
        // profile optional on login
      }
      setUser(u);
      sessionStorage.setItem('gamehub_user', JSON.stringify(u));
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const customerLogin = useCallback(async (mobile: string, password: string, tenantId?: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await apiCustomerLogin({
        mobile,
        password,
        tenant_id: tenantId,
      });
      const c = res.data?.customer;
      if (!c) return false;
      const u = userFromCustomerAuth(c);
      setUser(u);
      sessionStorage.setItem('gamehub_user', JSON.stringify(u));
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const customerSignup = useCallback(
    async (name: string, mobile: string, password: string, email?: string, tenantId?: number): Promise<boolean> => {
      setIsLoading(true);
      try {
        const res = await apiCustomerSignup({
          name,
          mobile,
          password,
          email: email || undefined,
          tenant_id: tenantId,
        });
        const c = res.data?.customer;
        if (!c) return false;
        const u = userFromCustomerAuth(c);
        setUser(u);
        sessionStorage.setItem('gamehub_user', JSON.stringify(u));
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return false;
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    sessionStorage.removeItem('gamehub_user');
    clearAccessToken();
    clearRefreshToken();
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('gamehub_user');
    clearAccessToken();
    clearRefreshToken();
  }, []);

  const establishSession = useCallback((u: User) => {
    setUser(u);
    sessionStorage.setItem('gamehub_user', JSON.stringify(u));
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { forgotPassword: forgot } = await import('../api');
      await forgot({ email });
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        customerLogin,
        customerSignup,
        establishSession,
        clearSession,
        logout,
        forgotPassword,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
