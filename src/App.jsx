import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CreateUser from './components/CreateUser';
import Overview from './components/Overview';
import Courses from './components/Courses';
import Students from './components/Students';
import Fees from './components/Fees';
import FeeStatus from './components/FeeStatus';
import StudentStatus from './components/StudentStatus';
import CourseEnrollment from './components/CourseEnrollment';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Main Dashboard Layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            {/* Default View */}
            <Route index element={<Overview />} />

            {/* Admin Only Routes */}
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
            
            {/* NEW: Status Management should probably be Admin Only */}
            <Route
              path="studentstatus"
              element={
                <ProtectedRoute requiredRole="admin">
                  <StudentStatus />
                </ProtectedRoute>
              }
            />

            {/* Shared Routes (Admin & Cashier) */}
            <Route
              path="fees"
              element={
                <ProtectedRoute>
                  <Fees />
                </ProtectedRoute>
              }
            />
            <Route
              path="feestatus"
              element={
                <ProtectedRoute>
                  <FeeStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="students"
              element={
                <ProtectedRoute>
                  <Students />
                </ProtectedRoute>
              }
            />
            <Route
              path="courseenrollment"
              element={
                <ProtectedRoute>
                  <CourseEnrollment />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Redirection Logic */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;