import api from './api';
import type { Artwork, ArtworkStatus, PaginatedResponse } from '../types';

export const artworkService = {
  getAll: async (page = 1, limit = 20): Promise<PaginatedResponse<Artwork> | Artwork[]> => {
    const res = await api.get('/artworks', { params: { page, limit } });
    return res.data;
  },

  getById: async (id: string): Promise<Artwork> => {
    const res = await api.get(`/artworks/${id}`);
    return res.data;
  },

  create: async (data: Partial<Artwork>): Promise<Artwork> => {
    const res = await api.post('/artworks', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Artwork>): Promise<Artwork> => {
    const res = await api.patch(`/artworks/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/artworks/${id}`);
  },

  changeStatus: async (id: string, status: ArtworkStatus, reason?: string): Promise<Artwork> => {
    const res = await api.patch(`/artworks/${id}/status`, { status, reason });
    return res.data;
  },
};
