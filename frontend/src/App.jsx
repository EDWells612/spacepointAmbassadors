import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Apply from './pages/Apply';
import TeacherApply from './pages/TeacherApply';
import InstructorApply from './pages/InstructorApply';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Tasks from './pages/Tasks';
import Network from './pages/Network';
import TeacherPortal from './pages/TeacherPortal';
import AdminPortal from './pages/Admin';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-secondary">Loading...</div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-neutral text-on-surface flex flex-col font-inter">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Root redirect based on role */}
              <Route path="/" element={<HomeRedirect />} />

              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/teacher-apply" element={<TeacherApply />} />
              <Route path="/invite/:code" element={<InstructorApply />} />

              {/* Ambassador portal */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['ambassador']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/leads" element={
                <ProtectedRoute allowedRoles={['ambassador']}>
                  <Leads />
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute allowedRoles={['ambassador', 'teacher']}>
                  <Tasks />
                </ProtectedRoute>
              } />
              <Route path="/network" element={
                <ProtectedRoute allowedRoles={['ambassador']}>
                  <Network />
                </ProtectedRoute>
              } />

              {/* Teacher portal */}
              <Route path="/teacher" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherPortal />
                </ProtectedRoute>
              } />

              {/* Admin portal */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPortal />
                </ProtectedRoute>
              } />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;