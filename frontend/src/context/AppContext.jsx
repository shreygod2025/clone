import { createContext, useContext, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { UserAuthProvider, useUserAuth } from './UserAuthContext';
import { CartProvider, useCart } from './CartContext';
import { SchoolProvider, useSchool } from './SchoolContext';

export const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [globalBanner, setGlobalBanner] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AuthProvider>
      <UserAuthProvider>
        <CartProvider>
          <SchoolProvider>
            <AppContext.Provider
              value={{
                isOnline,
                globalBanner,
                setGlobalBanner
              }}
            >
              {children}
            </AppContext.Provider>
          </SchoolProvider>
        </CartProvider>
      </UserAuthProvider>
    </AuthProvider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Re-export all sub-context hooks for unified imports
export { useAuth, useUserAuth, useCart, useSchool };
export default AppContext;
