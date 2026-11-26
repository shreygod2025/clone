import api from './api';

export const expenseService = {
  // Submit an expense claim
  submitExpense: async (data) => {
    const res = await api.post('/expenses', data);
    return res.data;
  },

  // List expenses (admin/finance)
  listExpenses: async (params = {}) => {
    const res = await api.get('/expenses', { params });
    return res.data;
  },

  // Approve expense
  approveExpense: async (expenseId, remarks = '') => {
    const res = await api.patch(`/expenses/${expenseId}/approve`, { remarks });
    return res.data;
  },

  // Reject expense
  rejectExpense: async (expenseId, remarks = '') => {
    const res = await api.patch(`/expenses/${expenseId}/reject`, { remarks });
    return res.data;
  },
};

export default expenseService;
