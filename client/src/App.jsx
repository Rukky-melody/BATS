import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import ApplyPage from './pages/ApplyPage';
import AdminDashboard from './pages/AdminDashboard';
import ManageHostels from './pages/ManageHostels';
import ManageApplications from './pages/ManageApplications';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  // Redirect root based on role
  const getHomePage = () => {
    if (!user) return <Navigate to="/login" />;
    if (user.role === 'admin' || user.role === 'super_admin') return <Navigate to="/admin" />;
    return <Navigate to="/dashboard" />;
  };

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={user ? getHomePage() : <LoginPage />} />
          <Route path="/register" element={user ? getHomePage() : <RegisterPage />} />

          {/* Student routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/apply" element={
            <ProtectedRoute requiredRole="student"><ApplyPage /></ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/hostels" element={
            <ProtectedRoute requiredRole={['admin', 'super_admin']}><ManageHostels /></ProtectedRoute>
          } />
          <Route path="/admin/applications" element={
            <ProtectedRoute requiredRole={['admin', 'super_admin']}><ManageApplications /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={getHomePage()} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
