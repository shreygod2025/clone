import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('oll_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const sendOTP = async (phone, userType = 'student') => {
    try {
      const response = await axios.post(`${API}/auth/send-otp`, { phone, user_type: userType });
      return { success: true, message: response.data.message, sent: response.data.sent };
    } catch (error) {
      return { success: false, message: error.response?.data?.detail || 'Failed to send OTP' };
    }
  };

  const verifyOTP = async (phone, otp, userType = 'student') => {
    try {
      const response = await axios.post(`${API}/auth/verify-otp`, { phone, otp, user_type: userType });
      const userData = {
        ...response.data,
        user_type: userType, // Ensure user_type is always set
        phone: phone
      };
      setUser(userData);
      localStorage.setItem('oll_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, message: error.response?.data?.detail || 'Invalid OTP' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('oll_user');
  };

  const updateUserBooking = (bookingData) => {
    // Update user with booking data, name, and phone (for first-time users)
    const updatedUser = { 
      ...user, 
      latest_booking: bookingData,
      name: user?.name || bookingData?.name || bookingData?.contact_name,
      phone: user?.phone || bookingData?.phone
    };
    setUser(updatedUser);
    localStorage.setItem('oll_user', JSON.stringify(updatedUser));
  };

  return (
    <UserAuthContext.Provider value={{
      user,
      loading,
      isLoggedIn: !!user,
      sendOTP,
      verifyOTP,
      logout,
      updateUserBooking
    }}>
      {children}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error('useUserAuth must be used within UserAuthProvider');
  }
  return context;
};
