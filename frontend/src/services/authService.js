import api from './api';

export const authService = {
  // Admin Login
  adminLogin: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data?.token) {
      localStorage.setItem('oll_token', res.data.token);
    }
    return res.data;
  },

  // Verify Admin Token
  verifyAdminToken: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // Admin Logout
  adminLogout: () => {
    localStorage.removeItem('oll_token');
  },

  // Student OTP send
  sendStudentOtp: async (phone) => {
    const res = await api.post('/auth/student/send-otp', { phone });
    return res.data;
  },

  // Student OTP verify
  verifyStudentOtp: async (phone, otp) => {
    const res = await api.post('/auth/student/verify-otp', { phone, otp });
    if (res.data?.token) {
      localStorage.setItem('oll_portal_token', res.data.token);
    }
    return res.data;
  },

  // Student Logout
  studentLogout: () => {
    localStorage.removeItem('oll_portal_token');
  },
};

export default authService;
