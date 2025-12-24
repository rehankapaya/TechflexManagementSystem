import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation(); // To remember where the user was trying to go

  // 1. Handle the "Flash" state while Firebase verifies the session
  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <div style={styles.spinner}></div>
        <p style={styles.text}>Verifying Authentication...</p>
      </div>
    );
  }

  // 2. If not logged in, redirect to login page
  // We use 'state' to save the current location so we can redirect them back after login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Check for specific Role Authorization (RBAC)
  if (requiredRole && currentUser.role !== requiredRole) {
    console.warn(`Access denied: User role '${currentUser.role}' does not match required role '${requiredRole}'`);
    return <Navigate to="/dashboard" replace />;
  }

  // 4. If all checks pass, render the requested component
  return children;
};

const styles = {
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#f8fafc',
    fontFamily: 'sans-serif'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #4318ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  text: {
    marginTop: '15px',
    color: '#64748b',
    fontSize: '14px'
  }
};

// Add keyframe for spinner
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(styleSheet);

export default ProtectedRoute;