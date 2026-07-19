import React from 'react';
import { Navigate } from 'react-router-dom';

interface RoleWrapperProps {
  children: React.ReactElement;
  allowedRoles: string[];
}

export const RoleWrapper: React.FC<RoleWrapperProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('stadium_iq_token');
  const role = localStorage.getItem('stadium_iq_role');

  if (!token || !role) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role.toLowerCase())) {
    // Logged in but unauthorized role
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RoleWrapper;
