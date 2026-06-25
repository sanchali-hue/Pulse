import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  loginWithGoogle: (email: string, fullName: string, googleId: string, imageUrl: string) => Promise<void>;
  onboard: (fullName: string, avatarUrl: string, bio: string, status?: string) => Promise<void>;
  updateStatus: (status: 'Active' | 'Away' | 'Do Not Disturb' | 'Offline') => Promise<void>;
  updateProfile: (fullName: string, bio: string, avatarUrl: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pulse-token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (err: any) {
        console.error('Failed to fetch user profiles:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, password: String) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;
      localStorage.setItem('pulse-token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to authenticate user.');
      throw err;
    }
  };

  const signup = async (email: string, password: string, username: string, fullName: string) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', { email, password, username, fullName });
      const { token: receivedToken, user: receivedUser } = response.data;
      localStorage.setItem('pulse-token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
      throw err;
    }
  };

  const loginWithGoogle = async (email: string, fullName: string, googleId: string, imageUrl: string) => {
    setError(null);
    try {
      const response = await api.post('/auth/google', { email, fullName, googleId, imageUrl });
      const { token: receivedToken, user: receivedUser } = response.data;
      localStorage.setItem('pulse-token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google Sign-In failed.');
      throw err;
    }
  };

  const onboard = async (fullName: string, avatarUrl: string, bio: string, status?: string) => {
    setError(null);
    try {
      const response = await api.post('/auth/onboard', { fullName, avatarUrl, bio, status });
      setUser(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Onboarding failed.');
      throw err;
    }
  };

  const updateStatus = async (status: 'Active' | 'Away' | 'Do Not Disturb' | 'Offline') => {
    try {
      const response = await api.put('/users/status', { status });
      if (user) {
        setUser({ ...user, status: response.data.status });
      }
    } catch (err: any) {
      console.error('Failed to update status', err);
    }
  };

  const updateProfile = async (fullName: string, bio: string, avatarUrl: string) => {
    try {
      const response = await api.put('/users/profile', { fullName, bio, avatarUrl });
      setUser(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile.');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('pulse-token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        loginWithGoogle,
        onboard,
        updateStatus,
        updateProfile,
        logout,
        clearError,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
