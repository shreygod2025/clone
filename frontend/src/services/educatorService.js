import api from './api';

export const educatorService = {
  // Apply for educator position
  apply: async (data) => {
    const res = await api.post('/educators/apply', data);
    return res.data;
  },

  // List applicants (admin)
  listApplicants: async (params = {}) => {
    const res = await api.get('/educators/applicants', { params });
    return res.data;
  },

  // Schedule interview or demo
  scheduleInterview: async (applicantId, data) => {
    const res = await api.post(`/educators/applicants/${applicantId}/interviews`, data);
    return res.data;
  },

  // Get educator profile
  getProfile: async () => {
    const res = await api.get('/educators/portal/profile');
    return res.data;
  },

  // Get assigned batches / classes
  getBatches: async () => {
    const res = await api.get('/educators/portal/batches');
    return res.data;
  },
};

export default educatorService;
