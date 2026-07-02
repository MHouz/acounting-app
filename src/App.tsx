import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { Toaster, toast } from 'react-hot-toast';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Payments from './pages/Payments';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

import { error, warn, info } from '@tauri-apps/plugin-log';

const AppListeners = () => {
  React.useEffect(() => {
    const handleOnline = () => {
      toast.success('Connexion rétablie', { id: 'network-status' });
      info('App went online');
    };
    
    const handleOffline = () => {
      toast.error('Vous êtes hors ligne. Les modifications locales seront synchronisées plus tard.', { id: 'network-status', duration: 5000 });
      warn('App went offline');
    };

    const handleError = (e: ErrorEvent) => {
      error(`Unhandled error: ${e.message} at ${e.filename}:${e.lineno}`);
    };

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      error(`Unhandled promise rejection: ${String(e.reason)}`);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ConfirmProvider>
          <HashRouter>
            <AppListeners />
            <Toaster position="top-right" />
            <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Navigate to="/clients/active" replace />} />
            <Route path="clients/active" element={<Clients statusFilter="active" />} />
            <Route path="clients/inactive" element={<Clients statusFilter="inactive" />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="services" element={<Services />} />
            <Route path="payments" element={<Payments />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Fallback for any unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
        </ConfirmProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
