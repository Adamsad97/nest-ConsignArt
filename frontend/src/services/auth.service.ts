import api from './api';
import type { AuthResponse, User } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  register: async (data: { email: string; password: string; role: string }): Promise<User> => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // même si ça fail côté serveur, on nettoie le local
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await api.post('/auth/refresh', { refreshToken });
    return res.data;
  },

  getCurrentUser: (): User | null => {
    const s = localStorage.getItem('user');
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  },

  isLoggedIn: (): boolean => {
    return !!localStorage.getItem('token');
  },
};
