'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import ConfirmModal from '../../components/ConfirmModal';

interface DeliverySettings {
  insideDhakaNormal: number;
  dhakaSubNormal: number;
  outsideDhakaNormal: number;
  insideDhakaExpress: number;
  expressEnabled: boolean;
}

export default function ModeratorDeliveryPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DeliverySettings>({
    insideDhakaNormal: 60,
    dhakaSubNormal: 80,
    outsideDhakaNormal: 120,
    insideDhakaExpress: 150,
    expressEnabled: false,
  });
  const [pending, setPending] = useState(false);

  const canView = hasPermission('DELIVERY_SETTINGS_VIEW');
  const canUpdate = hasPermission('DELIVERY_SETTINGS_UPDATE');

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    apiFetch<DeliverySettings>('/api/admin/delivery')
      .then((data) => { setSettings(data); setForm(data); })
      .catch(() => toast('Failed to load delivery settings', 'error'))
      .finally(() => setLoading(false));
  }, [canView]);

  const hasChanges = settings && (
    settings.insideDhakaNormal !== form.insideDhakaNormal ||
    settings.dhakaSubNormal !== form.dhakaSubNormal ||
    settings.outsideDhakaNormal !== form.outsideDhakaNormal ||
    settings.insideDhakaExpress !== form.insideDhakaExpress ||
    settings.expressEnabled !== form.expressEnabled
  );

  const handleSave = () => setPending(true);

  const confirmSave = async () => {
    setSaving(true);
    try {
      const updated = await apiFetch<DeliverySettings>('/api/admin/delivery', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setSettings(updated);
      setForm(updated);
      toast('Delivery settings saved', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
      setPending(false);
    }
  };

  if (!canView) return <p>You do not have permission to view delivery settings.</p>;
  if (loading) return <p>Loading delivery settings...</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Delivery Settings</h1>

      <div style={{ background: '#fff', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', maxWidth: 600 }}>
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Inside Dhaka — Normal Delivery (৳)</label>
            <input
              type="number"
              min={0}
              value={form.insideDhakaNormal}
              onChange={(e) => setForm({ ...form, insideDhakaNormal: Number(e.target.value) })}
              disabled={!canUpdate}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Dhaka Sub — Normal Delivery (৳)</label>
            <input
              type="number"
              min={0}
              value={form.dhakaSubNormal}
              onChange={(e) => setForm({ ...form, dhakaSubNormal: Number(e.target.value) })}
              disabled={!canUpdate}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Outside Dhaka — Normal Delivery (৳)</label>
            <input
              type="number"
              min={0}
              value={form.outsideDhakaNormal}
              onChange={(e) => setForm({ ...form, outsideDhakaNormal: Number(e.target.value) })}
              disabled={!canUpdate}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canUpdate ? 'pointer' : 'default' }}>
              <input
                type="checkbox"
                checked={form.expressEnabled}
                onChange={(e) => setForm({ ...form, expressEnabled: e.target.checked })}
                disabled={!canUpdate}
              />
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Enable Express Delivery</span>
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4, marginLeft: 24 }}>
              Express delivery is only available Inside Dhaka. Outside Dhaka Express is not supported.
            </p>
          </div>
          {form.expressEnabled && (
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Inside Dhaka — Express Delivery (৳)</label>
              <input
                type="number"
                min={0}
                value={form.insideDhakaExpress}
                onChange={(e) => setForm({ ...form, insideDhakaExpress: Number(e.target.value) })}
                disabled={!canUpdate}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          )}
        </div>

        {canUpdate && (
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{
              marginTop: 'var(--space-lg)',
              padding: '8px 20px',
              background: hasChanges ? 'var(--color-success)' : 'var(--color-border)',
              color: hasChanges ? '#fff' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              cursor: hasChanges ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {pending && (
        <ConfirmModal
          open
          title="Save Delivery Settings?"
          description="These charges will apply to all future orders at checkout."
          confirmLabel="Save"
          confirmColor="var(--color-success)"
          loading={saving}
          loadingLabel="Saving..."
          onConfirm={confirmSave}
          onCancel={() => { if (!saving) setPending(false); }}
        />
      )}
    </div>
  );
}
