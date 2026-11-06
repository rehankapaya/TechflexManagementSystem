import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

// Lazy-loaded or standard imports for code splitting
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Overview from './components/Overview';
import CreateUser from './components/CreateUser';
import MonthlyAnalytics from './components/MonthlyAnalytics';
import Courses from './components/Courses';
import StaffSalary from './components/StaffSalary';
import GlobalExport from './components/GlobalExport';
import CertificateGenerator from './components/CertificateGenerator';
import StudentStatus from './components/StudentStatus';
import Fees from './components/Fees';
import FeeStatus from './components/FeeStatus';
import OverdueFees from './components/OverdueFees';
import Expenses from './components/Expenses';
import Students from './components/Students';
import CourseEnrollment from './components/CourseEnrollment';
import TimeslotAnalytics from './components/TimeslotAnalytics';

// IIC Imports
import IICLayout from './components/iic/IICLayout';
import ExecutiveDashboard from './components/iic/ExecutiveDashboard';
import AdmissionForecasting from './components/iic/AdmissionForecasting';
import StudentRisk from './components/iic/StudentRisk';
import CourseAnalytics from './components/iic/CourseAnalytics';
import AIAssistant from './components/iic/AIAssistant';
import SocialMarketingAI from './components/iic/SocialMarketingAI';

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
              path="analytics"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MonthlyAnalytics />
                </ProtectedRoute>
              }
            />
            {/* Backward compatibility for previous typo */}
            <Route path="analtyics" element={<Navigate to="/dashboard/analytics" replace />} />
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
            
            {/* Status Management */}
            <Route
              path="studentstatus"
              element={
                <ProtectedRoute>
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
              path="overdue"
              element={
                <ProtectedRoute>
                  <OverdueFees />
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
            <Route
              path="timeslot-analytics"
              element={
                <ProtectedRoute>
                  <TimeslotAnalytics />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Top-Level Route Aliases / Backward Compatibility */}
          <Route path="/students" element={<Navigate to="/dashboard/students" replace />} />
          <Route path="/feestatus" element={<Navigate to="/dashboard/feestatus" replace />} />
          <Route path="/fee-status" element={<Navigate to="/dashboard/feestatus" replace />} />
          <Route path="/fees" element={<Navigate to="/dashboard/fees" replace />} />
          <Route path="/overdue" element={<Navigate to="/dashboard/overdue" replace />} />
          <Route path="/analytics" element={<Navigate to="/dashboard/analytics" replace />} />
          <Route path="/courses" element={<Navigate to="/dashboard/courses" replace />} />
          <Route path="/salary" element={<Navigate to="/dashboard/salary" replace />} />
          <Route path="/studentstatus" element={<Navigate to="/dashboard/studentstatus" replace />} />
          <Route path="/courseenrollment" element={<Navigate to="/dashboard/courseenrollment" replace />} />
          <Route path="/timeslot-analytics" element={<Navigate to="/dashboard/timeslot-analytics" replace />} />
          <Route path="/iic" element={<Navigate to="/dashboard/iic" replace />} />
          <Route path="/iic/*" element={<Navigate to="/dashboard/iic" replace />} />

          {/* Redirection Logic */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
