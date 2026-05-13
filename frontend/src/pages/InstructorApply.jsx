import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export default function InstructorApply() {
    // Support both /invite/:code (route param) and /invite?code=XXX (query param)
    const { code: routeCode } = useParams();
    const [searchParams] = useSearchParams();
    const inviteCode = routeCode || searchParams.get('code') || '';

    const [ambassadorName, setAmbassadorName] = useState('');
    const [codeValid, setCodeValid] = useState(null); // null=checking, true, false
    const [form, setForm] = useState({ name: '', email: '' });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (inviteCode) {
            validateCode();
        } else {
            setCodeValid(false);
        }
    }, [inviteCode]);

    const validateCode = async () => {
        try {
            const res = await axios.get(`${API_URL}/auth/invite/${inviteCode}`);
            setAmbassadorName(res.data.ambassador_name);
            setCodeValid(true);
        } catch {
            setCodeValid(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await axios.post(`${API_URL}/auth/instructor-apply`, {
                name: form.name,
                email: form.email,
                invite_code: inviteCode,
            });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    if (codeValid === null) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
                <p className="text-secondary">Validating invite code...</p>
            </div>
        );
    }

    if (!codeValid) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-md">
                <div className="bg-tertiary p-lg rounded-lg border border-error w-full max-w-md text-center shadow-2xl">
                    <div className="text-4xl mb-4">❌</div>
                    <h2 className="text-headline-md text-on-surface mb-2">Invalid Invite Link</h2>
                    <p className="text-body-md text-secondary mb-lg">
                        This invite link is invalid or has expired. Please ask your ambassador for a new one.
                    </p>
                    <Link to="/login" className="text-primary-60 hover:underline text-body-sm">Back to Login</Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-md">
                <div className="bg-tertiary p-lg rounded-lg border border-primary-90 w-full max-w-md text-center shadow-2xl">
                    <div className="text-4xl mb-4">🚀</div>
                    <h2 className="text-headline-md text-on-surface mb-2">Application Submitted!</h2>
                    <p className="text-body-md text-secondary mb-lg">
                        Your instructor application has been received. The Spacepoint team will review it and get back to you.
                    </p>
                    <Link to="/login" className="bg-primary hover:bg-primary-60 text-on-surface py-3 px-6 rounded-full inline-block font-semibold transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-md py-xl">
            <div className="bg-tertiary p-lg rounded-lg border border-primary-90 w-full max-w-md shadow-2xl">
                <div className="text-center mb-lg">
                    <h1 className="text-headline-md text-on-surface mb-2">Apply as Kit Instructor</h1>
                    <p className="text-body-sm text-secondary">
                        Invited by <span className="text-on-surface font-semibold">{ambassadorName}</span>
                    </p>
                </div>

                {error && (
                    <div className="bg-error/20 border border-error text-error text-body-sm p-3 rounded-md mb-md">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-sm">
                    <div>
                        <label className="block text-label-md text-secondary mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                            placeholder="Your full name"
                        />
                    </div>
                    <div>
                        <label className="block text-label-md text-secondary mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-primary hover:bg-primary-60 text-on-surface text-label-lg font-semibold py-4 rounded-full transition-colors mt-lg disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                </form>
            </div>
        </div>
    );
}