import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Building2 } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    matric_no: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    gender: '',
    level: '',
    department: '',
    faculty: '',
    phone: '',
    state_of_origin: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { confirm_password, ...data } = formData;
      data.level = parseInt(data.level);
      await register(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <Building2 size={40} className="auth-icon" />
          <h1>Create Account</h1>
          <p>Register for BATS — Hostel Accommodation System</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="matric_no">Matric Number *</label>
              <input id="matric_no" name="matric_no" type="text" value={formData.matric_no} onChange={handleChange} placeholder="e.g. COS/8670/2021" required />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your.email@fupre.edu.ng" required />
            </div>

            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input id="first_name" name="first_name" type="text" value={formData.first_name} onChange={handleChange} placeholder="First name" required />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input id="last_name" name="last_name" type="text" value={formData.last_name} onChange={handleChange} placeholder="Last name" required />
            </div>

            <div className="form-group">
              <label htmlFor="gender">Gender *</label>
              <select id="gender" name="gender" value={formData.gender} onChange={handleChange} required>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="level">Level *</label>
              <select id="level" name="level" value={formData.level} onChange={handleChange} required>
                <option value="">Select level</option>
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="500">500 Level</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="department">Department *</label>
              <input id="department" name="department" type="text" value={formData.department} onChange={handleChange} placeholder="e.g. Computer Science" required />
            </div>

            <div className="form-group">
              <label htmlFor="faculty">Faculty</label>
              <input id="faculty" name="faculty" type="text" value={formData.faculty} onChange={handleChange} placeholder="e.g. Science" />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="e.g. 08012345678" />
            </div>

            <div className="form-group">
              <label htmlFor="state_of_origin">State of Origin</label>
              <input id="state_of_origin" name="state_of_origin" type="text" value={formData.state_of_origin} onChange={handleChange} placeholder="e.g. Delta" />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Min. 6 characters" required />
            </div>

            <div className="form-group">
              <label htmlFor="confirm_password">Confirm Password *</label>
              <input id="confirm_password" name="confirm_password" type="password" value={formData.confirm_password} onChange={handleChange} placeholder="Re-enter password" required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            <UserPlus size={18} />
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
