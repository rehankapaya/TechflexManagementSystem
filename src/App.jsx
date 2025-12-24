import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute'; // Import our new file
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CreateUser from './components/CreateUser';
import Overview from './components/Overview';
import Courses from './components/Courses';
import Students from './components/Students';


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* All dashboard routes share this layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            {/* The index route /dashboard */}
            <Route index element={<Overview />} />

            {/* Sub-route /dashboard/users */}
            <Route
              path="users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <CreateUser />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Courses />
                </ProtectedRoute>
              }
            />

            <Route
              path="students"
              element={
                <ProtectedRoute >
                  <Students />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;