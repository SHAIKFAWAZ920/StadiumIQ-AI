import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import FanDashboard from './pages/FanDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import SecurityDashboard from './pages/SecurityDashboard';
import MedicalDashboard from './pages/MedicalDashboard';
import TransportDashboard from './pages/TransportDashboard';
import OpsDashboard from './pages/OpsDashboard';
import RoleWrapper from './components/RoleWrapper';
import AccessibilityWidget from './components/AccessibilityWidget';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Role-Protected Console Routes */}
          <Route
            path="/fan"
            element={
              <RoleWrapper allowedRoles={["fan"]}>
                <FanDashboard />
              </RoleWrapper>
            }
          />
          <Route
            path="/volunteer"
            element={
              <RoleWrapper allowedRoles={["volunteer"]}>
                <VolunteerDashboard />
              </RoleWrapper>
            }
          />
          <Route
            path="/security"
            element={
              <RoleWrapper allowedRoles={["security"]}>
                <SecurityDashboard />
              </RoleWrapper>
            }
          />
          <Route
            path="/medical"
            element={
              <RoleWrapper allowedRoles={["medical"]}>
                <MedicalDashboard />
              </RoleWrapper>
            }
          />
          <Route
            path="/transport"
            element={
              <RoleWrapper allowedRoles={["transport"]}>
                <TransportDashboard />
              </RoleWrapper>
            }
          />
          <Route
            path="/manager"
            element={
              <RoleWrapper allowedRoles={["manager"]}>
                <OpsDashboard />
              </RoleWrapper>
            }
          />

          {/* Root redirect logic */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
        
        {/* Floating Accessibility Portal */}
        <AccessibilityWidget />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
