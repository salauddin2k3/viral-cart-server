'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import PasswordInput from '../../components/PasswordInput';

export default function AdminChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { changePassword, logout } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(password);
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--color-surface)', padding: 'var(--space-md)' }}>
      <div style={{ width: 400, maxWidth: '100%', padding: 'var(--space-xl)', background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-sm)', textAlign: 'center' }}>Change Password</h1>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>
          You must change your password before continuing.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>New Password</label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              minLength={8}
            />
          </div>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Confirm Password</label>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              minLength={8}
            />
          </div>
          {error && <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)', textAlign: 'center' }}>{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {submitting ? 'Changing...' : 'Change Password'}
          </button>
          <button
            type="button"
            onClick={() => logout().then(() => router.push('/admin/login'))}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: 'var(--space-md)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Logout instead
          </button>
        </form>
      </div>
    </div>
  );
}
