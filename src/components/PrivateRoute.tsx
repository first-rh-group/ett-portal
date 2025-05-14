import React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode; // Permite múltiplos elementos como `children`
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token');
  console.log('Token enviado:', token);
  return token ? <>{children}</> : <Navigate to="/" />;
};

export default PrivateRoute;
