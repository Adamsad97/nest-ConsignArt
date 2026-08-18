import api from './api';
import type { Loan, PaginatedResponse } from '../types';

export const loanService = {
  getAll: async (page = 1, limit = 20): Promise<PaginatedResponse<Loan> | Loan[]> => {
    const res = await api.get('/loans', { params: { page, limit } });
    return res.data;
  },

  getById: async (id: string): Promise<Loan> => {
    const res = await api.get(`/loans/${id}`);
    return res.data;
  },

  create: async (data: { artworkId: string; borrowerName: string; startDate: string; endDate: string }): Promise<Loan> => {
    const res = await api.post('/loans', data);
    return res.data;
  },

  returnLoan: async (id: string): Promise<Loan> => {
    const res = await api.patch(`/loans/${id}/return`);
    return res.data;
  },
};
