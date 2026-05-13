import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

import { API_URL } from '../config';

export default function TeacherApply() {
    const [searchParams] = useSearchParams();
    const initialCode = searchParams.get('code') || '';

    const [inviteCode, setInviteCode] = useState(initialCode);
    const [ambassadorName, setAmbassadorName] = useState('');
    const [codeValid, setCodeValid] = useState(false);
    const [validating, setValidating] = useState(false);
    
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialCode) {
            validateCode(initialCode);
        }
    }, [initialCode]);

    const validateCode = async (code) => {
        if (!code) return;
        setValidating(true);
        setError('');
        try {
            const res = await axios.get(`${API_URL}/auth/invite/${code}`);
            setAmbassadorName(res.data.ambassador_name);
            setCodeValid(true);
        } catch {
            setCodeValid(false);
            setAmbassadorName('');
            setError('Invalid or expired invite code.');
        } finally {
            setValidating(false);
        }
    };

    const handleVerifyCode = (e) => {
        e.preventDefault();
        validateCode(inviteCode);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!codeValid) {
            setError('Please provide a valid invite code first.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await axios.post(`${API_URL}/auth/teacher-apply`, {
                name: form.name,
                email: form.email,
                password: form.password,
                role: 'teacher',
                invite_code: inviteCode,
            });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-md">
                <div className="bg-tertiary p-lg rounded-lg border border-primary-90 w-full max-w-md text-center shadow-2xl">
                    <div className="text-4xl mb-4">🎓</div>
                    <h2 className="text-headline-md text-on-surface mb-2">Application Received!</h2>
                    <p className="text-body-md text-secondary mb-lg">
                        Your teacher application is pending approval from your ambassador.
                        Once approved you'll be able to log in and submit sessions.
                    </p>
                    <Link to="/login" className="bg-primary hover:bg-primary-60 text-on-surface py-3 px-6 rounded-full inline-block font-semibold transition-colors">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-md py-xl">
            <div className="bg-tertiary p-lg rounded-lg border border-primary-90 w-full max-w-md shadow-2xl">
                <div className="text-center mb-lg">
                    <h1 className="text-headline-md text-on-surface mb-2">Apply as Industry Teacher</h1>
                    {codeValid && ambassadorName ? (
                        <p className="text-body-sm text-secondary">
                            Invited by <span className="text-on-surface font-semibold">{ambassadorName}</span>
                        </p>
                    ) : (
                        <p className="text-body-sm text-secondary">
                            You need an invite code from an ambassador to apply.
                        </p>
                    )}
                </div>

                {error && (
                    <div className="bg-error/20 border border-error text-error text-body-sm p-3 rounded-md mb-md">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-sm">
                    {!codeValid ? (
                        <div>
                            <label className="block text-label-md text-secondary mb-1">Invite Code</label>
                            <div className="flex gap-2">
                                <input type="text" required value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors uppercase"
                                    placeholder="Enter invite code" />
                                <button type="button" onClick={handleVerifyCode} disabled={validating || !inviteCode}
                                    className="bg-primary hover:bg-primary-60 text-on-surface px-4 rounded-md font-semibold transition-colors disabled:opacity-50">
                                    {validating ? '...' : 'Verify'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-label-md text-secondary mb-1">Full Name</label>
                                <input type="text" required value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                                    placeholder="Your full name" />
                            </div>
                            <div>
                                <label className="block text-label-md text-secondary mb-1">Email Address</label>
                                <input type="email" required value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                                    placeholder="you@example.com" />
                            </div>
                            <div>
                                <label className="block text-label-md text-secondary mb-1">Password</label>
                                <input type="password" required value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                                    placeholder="Create a password" />
                            </div>

                            <button type="submit" disabled={submitting}
                                className="w-full bg-primary hover:bg-primary-60 text-on-surface text-label-lg font-semibold py-4 rounded-full transition-colors mt-lg disabled:opacity-50">
                                {submitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </>
                    )}
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