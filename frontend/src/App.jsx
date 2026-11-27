import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from './components/ui/sonner';
import RaiseQueryButton from './components/RaiseQueryButton';

/**
 * Main Application Component
 * 
 * Modular architecture:
 * - AppProvider (wraps AuthProvider, UserAuthProvider, CartProvider, SchoolProvider)
 * - BrowserRouter
 * - AppRoutes (centralized route registry)
 * - Global overlays (Toaster, RaiseQueryButton)
 */
export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
        <RaiseQueryButton />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
