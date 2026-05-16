import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ShieldCheck, UserPlus, Mail, User, AlertCircle } from 'lucide-react';

export default function ManageAdmins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    assigned_gender: 'male'
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await api.get('/admin/users');
      setAdmins(response.data.users);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch admins.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      await api.post('/admin/users', formData);
      setSuccess('Admin created successfully.');
      setFormData({ username: '', email: '', full_name: '', password: '', assigned_gender: 'male' });
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create admin.');
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="dashboard-container admin-dashboard">
      <header className="dashboard-header">
        <h1>
          <ShieldCheck className="icon" /> Manage Administrative Users
        </h1>
        <p>Create and manage other administrators and assign their managing privileges.</p>
      </header>

      <div className="admin-content">
        <div className="premium-card">
          <h2>Create New Admin</h2>
          
          {error && <div className="alert error"><AlertCircle size={18} /> {error}</div>}
          {success && <div className="alert success"><ShieldCheck size={18} /> {success}</div>}

          <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '1rem' }}>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Full Name</label>
                <div className="input-group">
                  <User className="input-icon" size={18} />
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Username</label>
                <div className="input-group">
                  <User className="input-icon" size={18} />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="johndoe123"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-group">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Secure password"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Assigned Hostels</label>
                <select name="assigned_gender" value={formData.assigned_gender} onChange={handleChange} required>
                  <option value="male">Male Hostels Only</option>
                  <option value="female">Female Hostels Only</option>
                  <option value="all">All Hostels (Super Admin Rights)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              <UserPlus size={18} /> Create Administrator
            </button>
          </form>
        </div>

        <div className="table-card mt-2" style={{ marginTop: '2rem' }}>
          <h2>Existing Administrators</h2>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Access Scope</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin._id}>
                    <td>
                      <div style={{ fontWeight: '500' }}>{admin.full_name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{admin.email}</div>
                    </td>
                    <td>{admin.username}</td>
                    <td>
                      <span className={`status-badge ${admin.role === 'super_admin' ? 'approved' : 'pending'}`}>
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${admin.assigned_gender === 'all' ? 'allocated' : 'pending'}`}>
                        {admin.assigned_gender === 'all' ? 'All Hostels' : `${admin.assigned_gender} hostels`}
                      </span>
                    </td>
                    <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                      No administrators found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
