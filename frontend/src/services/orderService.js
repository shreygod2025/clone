import api from './api';

export const orderService = {
  // Create an order / checkout
  createOrder: async (data) => {
    const res = await api.post('/orders', data);
    return res.data;
  },

  // Get order by public order number
  getOrderByNumber: async (orderNumber) => {
    const res = await api.get(`/orders/${orderNumber}`);
    return res.data;
  },

  // List customer orders (phone-gated or admin)
  listOrders: async (params = {}) => {
    const res = await api.get('/orders', { params });
    return res.data;
  },

  // Initialize Cashfree checkout session
  createPaymentSession: async (orderId) => {
    const res = await api.post(`/payments/create-session`, { order_id: orderId });
    return res.data;
  },

  // Verify payment status
  verifyPayment: async (paymentData) => {
    const res = await api.post('/payments/verify', paymentData);
    return res.data;
  },
};

export default orderService;
