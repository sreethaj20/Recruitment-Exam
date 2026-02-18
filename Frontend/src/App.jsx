import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminLogin from './pages/Admin/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import ExamLanding from './pages/Candidate/ExamLanding';
import ApplicationForm from './pages/Candidate/ApplicationForm';
import SystemCheck from './pages/Candidate/SystemCheck';
import TestInterface from './pages/Candidate/TestInterface';
import SuccessPage from './pages/Candidate/SuccessPage';
import CandidateResultView from './pages/Admin/CandidateResultView';

const ProtectedRoute = ({ children }) => {
  const isAdmin = localStorage.getItem('admin_auth') === 'true';
  return isAdmin ? children : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/dashboard/*"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Candidate Routes */}
          <Route path="/exam/:token" element={<ExamLanding />} />
          <Route path="/exam/:token/form" element={<ApplicationForm />} />
          <Route path="/exam/:token/system-check" element={<SystemCheck />} />
          <Route path="/exam/:token/test" element={<TestInterface />} />
          <Route path="/exam/:token/success" element={<SuccessPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
