import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(identifier, password, 'admin');
      if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/admin');
      } else {
        // Fallback in case a student somehow logs in here
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-admin">
      <div className="auth-card auth-card-admin">
        <div className="auth-header">
          <ShieldCheck size={48} className="auth-icon" />
          <h1>Admin Portal</h1>
          <p>Secure System Access</p>
          <span className="auth-subtitle">Authorized Personnel Only</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="identifier">Username or Email</label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. admin"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            <ShieldCheck size={18} />
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
