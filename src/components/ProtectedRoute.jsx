import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-blue-600 mb-3">
          <Loader2 className="animate-spin" size={24} />
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verifying Session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    console.warn(`Access denied: User role '${currentUser.role}' does not match required role '${requiredRole}'`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
