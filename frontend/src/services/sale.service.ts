import api from './api';
import type { Sale, Invoice, PaginatedResponse } from '../types';

export const saleService = {
  getAll: async (page = 1, limit = 20): Promise<PaginatedResponse<Sale> | Sale[]> => {
    const res = await api.get('/sales', { params: { page, limit } });
    return res.data;
  },

  getById: async (id: string): Promise<Sale> => {
    const res = await api.get(`/sales/${id}`);
    return res.data;
  },

  create: async (data: { artworkId: string; salePrice: number; buyerEmail?: string }): Promise<Sale> => {
    const res = await api.post('/sales', data);
    return res.data;
  },

  getInvoice: async (saleId: string): Promise<Invoice> => {
    const res = await api.get(`/sales/${saleId}/invoice`);
    return res.data;
  },
};
