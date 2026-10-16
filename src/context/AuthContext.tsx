import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization } from '../types/crm.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { businessName: string; email: string; password: string; fullName: string; industry?: string }) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string, targetRole?: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.auth.me();
      setUser(data.user);
      setOrganization(data.organization);
    } catch (err) {
      console.warn('[Session Expired or Invalid]');
      api.clearToken();
      setUser(null);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      api.setToken(res.token);
      setUser(res.user);
      setOrganization(res.organization);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { businessName: string; email: string; password: string; fullName: string; industry?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      api.setToken(res.token);
      setUser(res.user);
      setOrganization(res.organization);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    setOrganization(null);
  };

  const switchOrganization = async (orgId: string, targetRole?: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.switchOrg(orgId, targetRole);
      api.setToken(res.token);
      setUser(res.user);
      setOrganization(res.organization);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        login,
        register,
        logout,
        switchOrganization,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
