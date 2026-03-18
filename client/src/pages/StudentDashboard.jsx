import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BedDouble, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/students/application-status');
      setApplications(res.data.applications);
      setAllocations(res.data.allocations);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'allocated': return <CheckCircle2 size={18} className="status-icon success" />;
      case 'approved': return <Clock size={18} className="status-icon warning" />;
      case 'pending': return <Clock size={18} className="status-icon info" />;
      case 'rejected': return <AlertCircle size={18} className="status-icon error" />;
      default: return <Clock size={18} className="status-icon" />;
    }
  };

  if (loading) {
    return <div className="page-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {user.first_name}!</h1>
        <p>Matric No: {user.matric_no}</p>
      </div>

      {/* Current Allocation */}
      {allocations.length > 0 && (
        <div className="card card-success">
          <div className="card-header">
            <BedDouble size={22} />
            <h2>Your Allocated Space</h2>
          </div>
          <div className="allocation-details">
            <div className="detail-item">
              <span className="detail-label">Hostel</span>
              <span className="detail-value">{allocations[0].hostel_name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Block</span>
              <span className="detail-value">{allocations[0].block_name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Room</span>
              <span className="detail-value">{allocations[0].room_number}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Bed</span>
              <span className="detail-value">{allocations[0].bed_number}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Floor</span>
              <span className="detail-value">{allocations[0].floor}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Session</span>
              <span className="detail-value">{allocations[0].session}</span>
            </div>
          </div>
        </div>
      )}

      {/* Applications */}
      <div className="card">
        <div className="card-header">
          <FileText size={22} />
          <h2>Your Applications</h2>
          {applications.length === 0 && (
            <Link to="/apply" className="btn btn-primary btn-sm">Apply Now</Link>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>You haven't submitted any applications yet.</p>
            <Link to="/apply" className="btn btn-primary">Apply for Accommodation</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Hostel Preference</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td>{app.session}</td>
                    <td>{app.hostel_preference || 'Any'}</td>
                    <td>
                      <span className={`badge badge-${app.payment_status === 'paid' || app.payment_status === 'verified' ? 'success' : 'warning'}`}>
                        {app.payment_status}
                      </span>
                    </td>
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
