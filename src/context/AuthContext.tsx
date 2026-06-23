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
import { clearAccessToken, clearRefreshToken } from '../api/config';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  customerLogin: (mobile: string, password: string) => Promise<boolean>;
  customerSignup: (
    name: string,
    mobile: string,
    password: string,
    email?: string
  ) => Promise<boolean>;
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

function userFromLoginResponse(email: string, data?: { user?: { id: number; email: string; role_id?: number; tenant_id?: number } }): User {
  const u = data?.user;
  const roleId = u?.role_id ?? 0;
  const role = ROLE_MAP[roleId] ?? (email.includes('admin') ? 'super_admin' : 'cashier');
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
    if (!user || user.role === 'customer' || user.tenantId) return;
    getMe()
      .then((profile) => {
        if (profile.data?.tenant_id != null) {
          const updated = {
            ...user,
            tenantId: String(profile.data.tenant_id),
            name: profile.data.display_name || user.name,
          };
          setUser(updated);
          sessionStorage.setItem('gamehub_user', JSON.stringify(updated));
        }
      })
      .catch(() => {});
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await apiLogin({ email, password });
      let u = userFromLoginResponse(email, res.data);
      try {
        const profile = await getMe();
        if (profile.data?.tenant_id != null) {
          u = { ...u, tenantId: String(profile.data.tenant_id), name: profile.data.display_name || u.name };
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

  const customerLogin = useCallback(async (mobile: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await apiCustomerLogin({ mobile, password });
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
    async (name: string, mobile: string, password: string, email?: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        const res = await apiCustomerSignup({
          name,
          mobile,
          password,
          email: email || undefined,
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
      value={{ user, login, customerLogin, customerSignup, logout, forgotPassword, isLoading }}
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
