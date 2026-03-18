import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Send, Building2, CreditCard } from 'lucide-react';

export default function ApplyPage() {
  const [hostels, setHostels] = useState([]);
  const [session, setSession] = useState('2025/2026');
  const [hostelPreference, setHostelPreference] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedApp, setSubmittedApp] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    try {
      // Use health check to see if server is running, then get hostels from public endpoint
      const res = await api.get('/admin/hostels').catch(() => ({ data: { hostels: [] } }));
      setHostels(res.data.hostels || []);
    } catch (err) {
      console.error('Failed to load hostels');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/students/apply', {
        session,
        hostel_preference_id: hostelPreference || null,
      });
      setSuccess(res.data.message);
      setSubmittedApp(res.data.application);
    } catch (err) {
      setError(err.response?.data?.error || 'Application failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!submittedApp) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/students/simulate-payment', {
        application_id: submittedApp.id,
      });
      setSuccess(res.data.message + ' Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Apply for Accommodation</h1>
        <p>Submit your hostel application for the current session</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="form-group">
            <label htmlFor="session">Academic Session *</label>
            <select id="session" value={session} onChange={(e) => setSession(e.target.value)} required>
              <option value="2025/2026">2025/2026</option>
              <option value="2024/2025">2024/2025</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="hostel_preference">Hostel Preference (Optional)</label>
            <select id="hostel_preference" value={hostelPreference} onChange={(e) => setHostelPreference(e.target.value)}>
              <option value="">No preference (any available)</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.gender}) — {h.available_beds} beds available
                </option>
              ))}
            </select>
          </div>

          {!submittedApp ? (
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              <Send size={18} />
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          ) : (
            <div className="payment-section">
              <div className="card card-info">
                <p><strong>Application submitted!</strong> Priority score: {submittedApp.priority_score}</p>
                <p>Proceed to payment to complete your application.</p>
              </div>
              <button
                type="button"
                className="btn btn-success btn-full"
                onClick={handleSimulatePayment}
                disabled={loading}
              >
                <CreditCard size={18} />
                {loading ? 'Processing...' : 'Simulate Payment (₦25,000)'}
              </button>
              <p className="text-muted">* Paystack integration coming soon</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
