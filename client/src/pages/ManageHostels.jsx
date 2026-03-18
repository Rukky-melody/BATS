import { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

export default function ManageHostels() {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', gender: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    try {
      const res = await api.get('/admin/hostels');
      setHostels(res.data.hostels);
    } catch (err) {
      console.error('Failed to fetch hostels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/admin/hostels', formData);
      setSuccess('Hostel created successfully!');
      setFormData({ name: '', gender: '', description: '' });
      setShowForm(false);
      fetchHostels();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create hostel.');
    }
  };

  if (loading) {
    return <div className="page-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manage Hostels</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? <ChevronUp size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancel' : 'Add Hostel'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card">
          <h3>Create New Hostel</h3>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="hostel_name">Hostel Name *</label>
                <input id="hostel_name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Hall C" required />
              </div>
              <div className="form-group">
                <label htmlFor="hostel_gender">Gender *</label>
                <select id="hostel_gender" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} required>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label htmlFor="hostel_desc">Description</label>
                <input id="hostel_desc" type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              <Plus size={18} /> Create Hostel
            </button>
          </form>
        </div>
      )}

      <div className="hostels-grid">
        {hostels.map((hostel) => (
          <div key={hostel.id} className="card hostel-card">
            <div className="hostel-header">
              <Building2 size={24} />
              <div>
                <h3>{hostel.name}</h3>
                <span className={`badge badge-${hostel.gender === 'male' ? 'blue' : 'pink'}`}>
                  {hostel.gender}
                </span>
              </div>
            </div>
            {hostel.description && <p className="hostel-desc">{hostel.description}</p>}
            <div className="hostel-stats">
              <div className="hostel-stat">
                <span className="stat-num">{hostel.total_blocks}</span>
                <span>Blocks</span>
              </div>
              <div className="hostel-stat">
                <span className="stat-num">{hostel.total_rooms}</span>
                <span>Rooms</span>
              </div>
              <div className="hostel-stat">
                <span className="stat-num">{hostel.total_beds}</span>
                <span>Total Beds</span>
              </div>
              <div className="hostel-stat">
                <span className="stat-num success">{hostel.available_beds}</span>
                <span>Available</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hostels.length === 0 && (
        <div className="empty-state">
          <Building2 size={48} />
          <p>No hostels created yet. Add your first hostel above.</p>
        </div>
      )}
    </div>
  );
}
