import { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, Users, BedDouble, BarChart3 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>BATS — Hostel Management Overview</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon bg-blue"><Users size={28} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.students}</span>
              <span className="stat-label">Registered Students</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-purple"><Building2 size={28} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.hostels}</span>
              <span className="stat-label">Hostels</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-green"><BedDouble size={28} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.bed_spaces.available}</span>
              <span className="stat-label">Available Beds</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-orange"><BarChart3 size={28} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.occupancy_rate}%</span>
              <span className="stat-label">Occupancy Rate</span>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="dashboard-cards">
          <div className="card">
            <h3>Bed Space Summary</h3>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${stats.occupancy_rate}%` }}></div>
            </div>
            <div className="summary-row">
              <span>Total: {stats.bed_spaces.total}</span>
              <span>Occupied: {stats.bed_spaces.occupied}</span>
              <span>Available: {stats.bed_spaces.available}</span>
            </div>
          </div>

          <div className="card">
            <h3>Applications Overview</h3>
            <div className="summary-row">
              <div className="summary-item">
                <span className="summary-count">{stats.applications.pending}</span>
                <span className="summary-label">Pending</span>
              </div>
              <div className="summary-item">
                <span className="summary-count">{stats.applications.approved}</span>
                <span className="summary-label">Approved</span>
              </div>
              <div className="summary-item">
                <span className="summary-count">{stats.applications.allocated}</span>
                <span className="summary-label">Allocated</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
