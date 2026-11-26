import api from './api';

export const userService = {
  // Get current student/user profile
  getProfile: async () => {
    const res = await api.get('/student-portal/profile');
    return res.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const res = await api.put('/student-portal/profile', data);
    return res.data;
  },

  // Get user bookings
  getBookings: async (phone) => {
    const res = await api.get('/bookings', { params: { phone } });
    return res.data;
  },

  // Get user orders / enrollments
  getOrders: async () => {
    const res = await api.get('/orders');
    return res.data;
  },

  // Get certificates
  getCertificates: async () => {
    const res = await api.get('/certificates/my');
    return res.data;
  },

  // Get assessments / quiz results
  getAssessments: async () => {
    const res = await api.get('/assessments/my');
    return res.data;
  },
};

export default userService;
