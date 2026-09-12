'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import ConfirmModal from '../../components/ConfirmModal';
import PasswordInput from '../../components/PasswordInput';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'moderator';
  status: 'active' | 'deactivated';
  mustChangePassword: boolean;
  permissions: string[];
  createdAt: string;
}

type PendingAction =
  | { type: 'create'; data: { name: string; email: string; password: string; role: 'moderator' } }
  | { type: 'deactivate'; staff: StaffMember }
  | { type: 'reactivate'; staff: StaffMember }
  | { type: 'resetPassword'; staff: StaffMember }
  | { type: 'delete'; staff: StaffMember }
  | null;

export default function AdminModeratorsPage() {
  const { user: currentUser, hasPermission, canCreateRole } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'moderator' as 'moderator' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PendingAction>(null);
  const [processing, setProcessing] = useState(false);
  const [editingModerator, setEditingModerator] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [editSaving, setEditSaving] = useState(false);
  const { toast } = useToast();

  const canView = currentUser?.role === 'admin' || hasPermission('MODERATORS_VIEW');
  const canCreate = currentUser?.role === 'admin' || canCreateRole('moderator');

  const fetchStaff = async () => {
    try {
      const res = await apiFetch<{ items: StaffMember[] }>('/api/admin/staff?limit=100');
      setStaff(res.items);
    } catch {
      toast('Failed to load staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (canView) fetchStaff(); }, [canView]);

  const validateForm = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setPending({ type: 'create', data: { ...form, role: 'moderator' } });
  };

  const handleDeactivateClick = (s: StaffMember) => {
    setPending({ type: 'deactivate', staff: s });
  };

  const handleReactivateClick = (s: StaffMember) => {
    setPending({ type: 'reactivate', staff: s });
  };

  const handleResetPasswordClick = (s: StaffMember) => {
    setPending({ type: 'resetPassword', staff: s });
  };

  const handleDeleteClick = (s: StaffMember) => {
    setPending({ type: 'delete', staff: s });
  };

  const executeAction = async () => {
    if (!pending || processing) return;
    setProcessing(true);
    try {
      switch (pending.type) {
        case 'create':
          await apiFetch('/api/admin/staff', {
            method: 'POST',
            body: JSON.stringify(pending.data),
          });
          toast('Moderator created successfully', 'success');
          setForm({ name: '', email: '', password: '', role: 'moderator' });
          setShowCreate(false);
          break;
        case 'deactivate':
          await apiFetch(`/api/admin/staff/${pending.staff.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'deactivated' }),
          });
          toast(`${pending.staff.name} deactivated`, 'success');
          break;
        case 'reactivate':
          await apiFetch(`/api/admin/staff/${pending.staff.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'active' }),
          });
          toast(`${pending.staff.name} reactivated`, 'success');
          break;
        case 'resetPassword':
          await apiFetch(`/api/admin/staff/${pending.staff.id}/reset-password`, { method: 'POST' });
          toast(`Password reset required for ${pending.staff.name} on next login`, 'success');
          break;
        case 'delete':
          await apiFetch(`/api/admin/staff/${pending.staff.id}`, { method: 'DELETE' });
          toast(`${pending.staff.name} deleted permanently`, 'success');
          break;
      }
      setPending(null);
      fetchStaff();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditClick = (s: StaffMember) => {
    setEditingModerator(s);
    setEditForm({ name: s.name, email: s.email });
  };

  const handleEditSubmit = async () => {
    if (!editingModerator) return;
    if (!editForm.name.trim()) { toast('Name is required', 'error'); return; }
    if (!editForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) { toast('Valid email is required', 'error'); return; }
    setEditSaving(true);
    try {
      await apiFetch(`/api/admin/staff/${editingModerator.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      toast('Moderator updated successfully', 'success');
      setEditingModerator(null);
      fetchStaff();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast(msg, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const getConfirmConfig = () => {
    if (!pending) return null;
    switch (pending.type) {
      case 'create':
        return {
          title: 'Confirm Account Creation',
          description: 'This is a sensitive administrative action. Please review the details below.',
          confirmLabel: 'Confirm & Create',
          confirmColor: 'var(--color-success)',
          loadingLabel: 'Creating...',
          details: [
            { label: 'Role', value: 'Moderator' },
            { label: 'Email', value: pending.data.email },
            { label: 'Name', value: pending.data.name },
            { label: 'Access', value: 'Standard moderator permissions (auto-assigned)' },
          ],
        };
      case 'deactivate':
        return {
          title: 'Deactivate Account?',
          description: `${pending.staff.name} will no longer be able to access the Moderator Dashboard.`,
          confirmLabel: 'Deactivate',
          confirmColor: 'var(--color-danger)',
          loadingLabel: 'Deactivating...',
          details: [
            { label: 'Email', value: pending.staff.email },
            { label: 'Role', value: pending.staff.role },
          ],
        };
      case 'reactivate':
        return {
          title: 'Reactivate Account?',
          description: `Are you sure you want to restore access for ${pending.staff.name}?`,
          confirmLabel: 'Activate',
          confirmColor: 'var(--color-success)',
          loadingLabel: 'Activating...',
          details: [
            { label: 'Email', value: pending.staff.email },
            { label: 'Role', value: pending.staff.role },
          ],
        };
      case 'resetPassword':
        return {
          title: 'Reset Password?',
          description: `${pending.staff.name} will be required to change their password on next login. Their current sessions will be revoked.`,
          confirmLabel: 'Reset Password',
          confirmColor: 'var(--color-warning)',
          loadingLabel: 'Resetting...',
          details: [
            { label: 'Email', value: pending.staff.email },
          ],
        };
      case 'delete':
        return {
          title: 'Delete Account?',
          description: `You are about to permanently remove ${pending.staff.name}. This action cannot be undone.`,
          confirmLabel: 'Delete Account',
          confirmColor: 'var(--color-danger)',
          loadingLabel: 'Deleting...',
          details: [
            { label: 'Email', value: pending.staff.email },
            { label: 'Role', value: pending.staff.role },
          ],
        };
    }
  };

  const confirmConfig = getConfirmConfig();

  if (!canView) {
    return <p>You do not have permission to view staff management.</p>;
  }

  if (loading) return <p>Loading staff...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Staff Management</h1>
        {canCreate && (
          <button onClick={() => { setShowCreate(!showCreate); setFormErrors({}); }} style={{ padding: '8px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
            {showCreate ? 'Cancel' : 'Add Staff'}
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreateSubmit} style={{ background: '#fff', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="grid-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: `1px solid ${formErrors.name ? 'var(--color-danger)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)' }} />
              {formErrors.name && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{formErrors.name}</span>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: `1px solid ${formErrors.email ? 'var(--color-danger)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)' }} />
              {formErrors.email && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{formErrors.email}</span>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Password</label>
              <PasswordInput
                value={form.password}
                onChange={(val) => setForm({ ...form, password: val })}
                required
              />
              {formErrors.password && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{formErrors.password}</span>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Role</label>
              <input type="text" value="Moderator" disabled style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)' }} />
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
            Moderators automatically receive standard access: Orders, Products, Categories, Delivery Settings, and Incomplete Orders.
          </p>

          <button type="submit" style={{ padding: '8px 16px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
            Create Staff
          </button>
        </form>
      )}

      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Name</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Email</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Role</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Status</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                  {s.name}
                </td>
                <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{s.email}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: s.role === 'admin' ? 'rgba(0,123,255,0.1)' : 'rgba(108,117,125,0.1)', color: s.role === 'admin' ? '#007bff' : 'var(--color-text-muted)' }}>
                    {s.role}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: s.status === 'active' ? 'rgba(40,167,69,0.1)' : 'rgba(108,117,125,0.1)', color: s.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {s.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
                  {s.role !== 'admin' && (
                    <>
                      <button onClick={() => handleEditClick(s)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                        Edit
                      </button>
                      {s.status === 'active' ? (
                        <button onClick={() => handleDeactivateClick(s)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                          Deactivate
                        </button>
                      ) : (
                        <button onClick={() => handleReactivateClick(s)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-success)', color: 'var(--color-success)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                          Reactivate
                        </button>
                      )}
                      <button onClick={() => handleResetPasswordClick(s)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                        Reset Password
                      </button>
                      <button onClick={() => handleDeleteClick(s)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {editingModerator && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={() => { if (!editSaving) setEditingModerator(null); }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', maxWidth: 500, width: '90%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Edit Moderator — {editingModerator.name}</h2>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Name</label>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
            </div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Email</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
              Moderator permissions are automatically assigned and cannot be changed.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleEditSubmit} disabled={editSaving} style={{ flex: 1, padding: '8px 16px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, opacity: editSaving ? 0.7 : 1 }}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingModerator(null)} disabled={editSaving} style={{ padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: '#fff', cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmConfig && (
        <ConfirmModal
          open={!!pending}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          confirmColor={confirmConfig.confirmColor}
          loading={processing}
          loadingLabel={confirmConfig.loadingLabel}
          onConfirm={executeAction}
          onCancel={() => { if (!processing) setPending(null); }}
          details={confirmConfig.details}
        />
      )}
    </div>
  );
}
