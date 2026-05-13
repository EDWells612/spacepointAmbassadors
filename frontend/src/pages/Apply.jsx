import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export default function Apply() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    country: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'ambassador',
        country: formData.country
      };
      
      await axios.post(`${API_URL}/auth/apply`, payload);
      setSuccess(true);
    } catch (err) {
      console.error('[Apply] Sign-up error:', err);
      if (err.response) {
        console.error('[Apply] Response status:', err.response.status);
        console.error('[Apply] Response data:', err.response.data);
      } else if (err.request) {
        console.error('[Apply] No response received (network error). Request:', err.request);
      } else {
        console.error('[Apply] Error setting up request:', err.message);
      }
      setError(err.response?.data?.detail || (err.request ? 'Network error — is the backend running on localhost:8000?' : err.message) || 'Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-md">
        <div className="bg-tertiary p-lg rounded-lg border border-primary-90 w-full max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 bg-primary-90 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h2 className="text-headline-md text-on-surface mb-2">Application Received!</h2>
          <p className="text-body-md text-secondary mb-lg">
            Thank you for applying to the SpacePoint Ambassador program. Our team will review your application and you will be notified soon.
          </p>
          <Link to="/login" className="bg-primary hover:bg-primary-60 text-on-surface py-3 px-6 rounded-full inline-block font-semibold transition-colors">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-md py-xl">
      <div className="bg-tertiary p-lg rounded-lg border border-primary-90 w-full max-w-md shadow-2xl">
        <div className="text-center mb-lg">
          <h1 className="text-headline-md text-on-surface mb-2">Become an Ambassador</h1>
          <p className="text-body-sm text-secondary">Lead the space education movement in your country</p>
        </div>

        {error && (
          <div className="bg-error/20 border border-error text-error text-body-sm p-3 rounded-md mb-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-sm">
          <div>
            <label className="block text-label-md text-secondary mb-1">Full Name</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Sarah Connor" />
          </div>
          <div>
            <label className="block text-label-md text-secondary mb-1">Email Address</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors" placeholder="sarah@example.com" />
          </div>
          <div>
            <label className="block text-label-md text-secondary mb-1">Country</label>
            <input type="text" name="country" required value={formData.country} onChange={handleChange} className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Egypt" />
          </div>
          <div>
            <label className="block text-label-md text-secondary mb-1">Password</label>
            <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors" placeholder="Create a strong password" />
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary-60 text-on-surface text-label-lg font-semibold py-4 rounded-full transition-colors mt-lg disabled:opacity-50">
            {isLoading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>

        <div className="mt-md text-center">
          <p className="text-body-sm text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-60 hover:text-secondary transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
