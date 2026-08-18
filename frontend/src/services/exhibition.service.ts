import api from './api';
import type { Exhibition, PaginatedResponse } from '../types';

export const exhibitionService = {
  getAll: async (page = 1, limit = 20): Promise<PaginatedResponse<Exhibition> | Exhibition[]> => {
    const res = await api.get('/exhibitions', { params: { page, limit } });
    return res.data;
  },

  getById: async (id: string): Promise<Exhibition> => {
    const res = await api.get(`/exhibitions/${id}`);
    return res.data;
  },

  create: async (data: Partial<Exhibition>): Promise<Exhibition> => {
    const res = await api.post('/exhibitions', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Exhibition>): Promise<Exhibition> => {
    const res = await api.patch(`/exhibitions/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/exhibitions/${id}`);
  },

  start: async (id: string): Promise<Exhibition> => {
    const res = await api.patch(`/exhibitions/${id}/start`);
    return res.data;
  },

  close: async (id: string): Promise<Exhibition> => {
    const res = await api.patch(`/exhibitions/${id}/close`);
    return res.data;
  },

  addArtwork: async (id: string, artworkId: string): Promise<Exhibition> => {
    const res = await api.post(`/exhibitions/${id}/artworks`, { artworkId });
    return res.data;
  },

  removeArtwork: async (id: string, artworkId: string): Promise<void> => {
    await api.delete(`/exhibitions/${id}/artworks/${artworkId}`);
  },
};
