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
import MonthlyAnalytics from './components/MonthlyAnalytics';
import GlobalExport from './components/GlobalExport';
import CertificateGenerator from './components/CertificateGenerator';
import Expenses from './components/Expenses';
import StaffSalary from './components/StaffSalary';
import IICLayout from './components/iic/IICLayout';
import ExecutiveDashboard from './components/iic/ExecutiveDashboard';
import AdmissionForecasting from './components/iic/AdmissionForecasting';
import FeeIntelligence from './components/iic/FeeIntelligence';
import StudentRisk from './components/iic/StudentRisk';
import CourseAnalytics from './components/iic/CourseAnalytics';
import AIAssistant from './components/iic/AIAssistant';
import SocialMarketingAI from './components/iic/SocialMarketingAI';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
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
              path="analtyics"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MonthlyAnalytics />
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
              path="record"
              element={
                <ProtectedRoute requiredRole="admin">
                  <GlobalExport />
                </ProtectedRoute>
              }
            />
                        <Route
              path="certificate"
              element={
                <ProtectedRoute requiredRole="admin">
                  <CertificateGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="salary"
              element={
                <ProtectedRoute requiredRole="admin">
                  <StaffSalary />
                </ProtectedRoute>
              }
            />

            {/* Institution Intelligence Center (IIC) Routes */}
            <Route
              path="iic"
              element={
                <ProtectedRoute requiredRole="admin">
                  <IICLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ExecutiveDashboard />} />
              <Route path="forecast" element={<AdmissionForecasting />} />
              <Route path="risk" element={<StudentRisk />} />
              <Route path="analytics" element={<CourseAnalytics />} />
              <Route path="assistant" element={<AIAssistant />} />
              <Route path="marketing" element={<SocialMarketingAI />} />
            </Route>
            
            {/* NEW: Status Management should probably be Admin Only */}
            <Route
              path="studentstatus"
              element={
                <ProtectedRoute >
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
              path="expenses"
              element={
                <ProtectedRoute>
                  <Expenses />
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