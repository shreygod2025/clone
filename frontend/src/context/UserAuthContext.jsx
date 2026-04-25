import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('oll_user');
    const storedToken = localStorage.getItem('oll_token');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const sendOTP = async (phone, userType = 'student', email = null) => {
    try {
      const response = await axios.post(`${API}/auth/send-otp`, { phone, user_type: userType, email });
      return { success: true, message: response.data.message, sent: response.data.sent, channel: response.data.channel };
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

  // Educator-specific login (returns JWT token)
  const educatorLogin = async (phone, otp) => {
    try {
      const response = await axios.post(`${API}/educator/login`, { 
        phone, 
        otp, 
        user_type: 'educator' 
      });
      
      const userData = {
        ...response.data.user,
        role: 'educator'
      };
      const accessToken = response.data.access_token;
      
      setUser(userData);
      setToken(accessToken);
      localStorage.setItem('oll_user', JSON.stringify(userData));
      localStorage.setItem('oll_token', accessToken);
      
      return { success: true, user: userData, token: accessToken };
    } catch (error) {
      return { success: false, message: error.response?.data?.detail || 'Login failed. Are you an onboarded educator?' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('oll_user');
    localStorage.removeItem('oll_token');
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
      token,
      loading,
      isLoggedIn: !!user,
      sendOTP,
      verifyOTP,
      educatorLogin,
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
