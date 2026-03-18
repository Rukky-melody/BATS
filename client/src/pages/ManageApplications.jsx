import { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Play, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function ManageApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [session, setSession] = useState('2025/2026');
  const [filterStatus, setFilterStatus] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [session, filterStatus]);

  const fetchApplications = async () => {
    try {
      const params = new URLSearchParams();
      if (session) params.append('session', session);
      if (filterStatus) params.append('status', filterStatus);
      const res = await api.get(`/admin/applications?${params}`);
      setApplications(res.data.applications);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    setError('');
    setResult(null);
    setAllocating(true);

    try {
      const res = await api.post('/admin/allocate', { session });
      setResult(res.data);
      fetchApplications();
    } catch (err) {
      setError(err.response?.data?.error || 'Allocation failed.');
    } finally {
      setAllocating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'allocated': return <CheckCircle2 size={16} className="status-icon success" />;
      case 'approved': return <Clock size={16} className="status-icon warning" />;
      case 'pending': return <Clock size={16} className="status-icon info" />;
      case 'rejected': return <AlertCircle size={16} className="status-icon error" />;
      default: return null;
    }
  };

  if (loading) {
    return <div className="page-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manage Applications</h1>
        <div className="header-actions">
          <select value={session} onChange={(e) => setSession(e.target.value)} className="filter-select">
            <option value="2025/2026">2025/2026</option>
            <option value="2024/2025">2024/2025</option>
          </select>
          <button
            className="btn btn-success"
            onClick={handleAllocate}
            disabled={allocating}
          >
            <Play size={18} />
            {allocating ? 'Running...' : 'Run Allocation'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="alert alert-success">
          <strong>{result.message}</strong><br />
          Total applications: {result.total_applications} |
          Allocated: {result.allocated} |
          No space: {result.failed_no_space}
        </div>
      )}

      <div className="card">
        <div className="filter-bar">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="allocated">Allocated</option>
            <option value="rejected">Rejected</option>
          </select>
          <span className="filter-count">{applications.length} applications</span>
        </div>

        {applications.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>No applications found for the selected filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Matric No</th>
                  <th>Student Name</th>
                  <th>Level</th>
                  <th>Gender</th>
                  <th>Preference</th>
                  <th>Payment</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="mono">{app.matric_no}</td>
                    <td>{app.first_name} {app.last_name}</td>
                    <td>{app.level}</td>
                    <td>{app.gender}</td>
                    <td>{app.hostel_preference || '—'}</td>
                    <td>
                      <span className={`badge badge-${app.payment_status === 'paid' ? 'success' : 'warning'}`}>
                        {app.payment_status}
                      </span>
                    </td>
                    <td>{app.priority_score}</td>
                    <td>
                      <span className="status-cell">
                        {getStatusIcon(app.application_status)}
                        {app.application_status}
                      </span>
                    </td>
                    <td>{new Date(app.applied_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
