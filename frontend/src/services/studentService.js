import api from './api';

export const studentService = {
  // Capture student inquiry
  createInquiry: async (data) => {
    const res = await api.post('/students/inquiries', data);
    return res.data;
  },

  // List student inquiries (admin/team)
  listInquiries: async (params = {}) => {
    const res = await api.get('/students/inquiries', { params });
    return res.data;
  },

  // Schedule demo class
  scheduleDemo: async (data) => {
    const res = await api.post('/students/demo-bookings', data);
    return res.data;
  },

  // Get demo bookings for student
  getDemoBookings: async (phone) => {
    const res = await api.get('/students/demo-bookings', { params: { phone } });
    return res.data;
  },

  // Update inquiry status
  updateStatus: async (inquiryId, status, extra = {}) => {
    const res = await api.patch(`/students/inquiries/${inquiryId}/status`, { status, ...extra });
    return res.data;
  },
};

export default studentService;
