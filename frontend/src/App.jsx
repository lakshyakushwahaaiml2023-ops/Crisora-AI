import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute, RoleRoute, AppLayout } from './components/Layout';

import { Toaster } from 'react-hot-toast';
import { LoginPage, RegisterPage, CitizenApp, AIAssistantPage, CollectorDashboard, AuthorityPanel, SimulationLab } from './pages';

// Component to handle root redirect based on authentication and role
const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-theme-bg text-theme-text flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (user?.role) {
    case 'citizen':
      return <Navigate to="/citizen" replace />;
    case 'collector':
      return <Navigate to="/collector" replace />;
    case 'district_authority':
    case 'state_authority':
    case 'ndma':
      return <Navigate to="/authority" replace />;
    default:
      // Fallback if role is unknown
      return <Navigate to="/login" replace />;
  }
};

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect handles the routing logic based on auth/role state */}
      <Route path="/" element={<RootRedirect />} />
      
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected Layout Route */}
      <Route element={
        <ProtectedRoute>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </ProtectedRoute>
      }>
        {/* Dashboards inside the Layout */}
        <Route path="/citizen" element={
          <RoleRoute allowedRoles={['citizen']}>
            <CitizenApp />
          </RoleRoute>
        } />
        
        <Route path="/citizen/ai" element={
          <RoleRoute allowedRoles={['citizen']}>
            <AIAssistantPage />
          </RoleRoute>
        } />
        
        <Route path="/collector" element={
          <RoleRoute allowedRoles={['collector']}>
            <CollectorDashboard />
          </RoleRoute>
        } />
        
        <Route path="/authority" element={
          <RoleRoute allowedRoles={['district_authority', 'state_authority', 'ndma']}>
            <AuthorityPanel />
          </RoleRoute>
        } />
        
        <Route path="/authority/simulation" element={
          <RoleRoute allowedRoles={['district_authority', 'state_authority', 'ndma']}>
            <SimulationLab />
          </RoleRoute>
        } />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#1E293B',
              border: '1px solid #D8E0EA'
            }
          }} />
          <AppRoutes />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
