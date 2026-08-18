import api from './api';
import type { Artist, PaginatedResponse } from '../types';

export const artistService = {
  getAll: async (page = 1, limit = 20): Promise<PaginatedResponse<Artist> | Artist[]> => {
    const res = await api.get('/artists', { params: { page, limit } });
    return res.data;
  },

  getById: async (id: string): Promise<Artist> => {
    const res = await api.get(`/artists/${id}`);
    return res.data;
  },

  create: async (data: Partial<Artist>): Promise<Artist> => {
    const res = await api.post('/artists', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Artist>): Promise<Artist> => {
    const res = await api.patch(`/artists/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/artists/${id}`);
  },

  activate: async (id: string): Promise<Artist> => {
    const res = await api.patch(`/artists/${id}/activate`);
    return res.data;
  },

  transfer: async (id: string, galleryId: string): Promise<Artist> => {
    const res = await api.patch(`/artists/${id}/transfer`, { galleryId });
    return res.data;
  },
};
