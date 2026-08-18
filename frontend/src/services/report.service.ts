import api from './api';
import type { ArtistStatement } from '../types';

export const reportService = {
  getGalleryDashboard: async (galleryId?: string) => {
    const res = await api.get('/reports/dashboard/gallery', {
      params: galleryId ? { galleryId } : {},
    });
    return res.data;
  },

  getArtistDashboard: async (artistId: string) => {
    const res = await api.get(`/reports/dashboard/artist/${artistId}`);
    return res.data;
  },

  getAdminDashboard: async () => {
    const res = await api.get('/reports/dashboard/admin');
    return res.data;
  },

  generateStatement: async (artistId: string, periodStart: string, periodEnd: string): Promise<ArtistStatement> => {
    const res = await api.post('/reports/artist-statements', { artistId, periodStart, periodEnd });
    return res.data;
  },

  getStatementsByArtist: async (artistId: string): Promise<ArtistStatement[]> => {
    const res = await api.get(`/reports/artist-statements/artist/${artistId}`);
    return res.data;
  },
};
