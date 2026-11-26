import api from './api';

export const schoolService = {
  // Submit school inquiry / demo request
  submitInquiry: async (payload) => {
    const res = await api.post('/school-inquiries', payload);
    return res.data;
  },

  // Submit brochure download lead
  downloadBrochure: async (payload) => {
    const res = await api.post('/school-inquiries/brochure', payload);
    return res.data;
  },

  // Get all school lab & curriculum offerings
  getOfferings: async () => {
    const res = await api.get('/school-offerings');
    return res.data;
  },

  // Get specific offering detail
  getOfferingBySlug: async (slug) => {
    const res = await api.get(`/school-offerings/${slug}`);
    return res.data;
  },
};

export default schoolService;
