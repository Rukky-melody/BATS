import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Home, FileText, Building2, Users, LayoutDashboard, ShieldCheck, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin, isStudent } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <Building2 size={24} />
          <span>BATS</span>
        </Link>
      </div>

      <div className="navbar-links">
        {isStudent && (
          <>
            <Link to="/dashboard" className="nav-link">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link to="/apply" className="nav-link">
              <FileText size={18} />
              <span>Apply</span>
            </Link>
          </>
        )}

        {isAdmin && (
          <>
            <Link to="/admin" className="nav-link">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link to="/admin/hostels" className="nav-link">
              <Building2 size={18} />
              <span>Hostels</span>
            </Link>
            <Link to="/admin/applications" className="nav-link">
              <Users size={18} />
              <span>Applications</span>
            </Link>
            {user.role === 'super_admin' && (
              <Link to="/admin/users" className="nav-link">
                <ShieldCheck size={18} />
                <span>Admins</span>
              </Link>
            )}
          </>
        )}
      </div>

      <div className="navbar-user">
        <span className="user-name">
          {isAdmin ? user.full_name || user.username : `${user.first_name} ${user.last_name}`}
        </span>
        <span className="user-role">{user.role}</span>
        
        <button onClick={toggleTheme} className="btn-icon" title="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button onClick={handleLogout} className="btn-icon btn-logout" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
