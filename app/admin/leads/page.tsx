'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../lib/toast';
import PhoneActions from '../../components/PhoneActions';

interface LeadItem {
  nameSnapshot: string;
  quantity: number;
  unitPrice: number;
  product: { id: string; name: string; slug: string } | null;
}

interface Lead {
  id: string;
  sessionId: string;
  name: string | null;
  phone: string | null;
  districtArea: string | null;
  address: string | null;
  note: string | null;
  deliveryMethod: string | null;
  status: string;
  computedStatus?: string;
  createdAt: string;
  updatedAt: string;
  items: LeadItem[];
  convertedOrder: { orderNumber: string } | null;
}

interface Summary {
  active: number;
  abandoned: number;
  converted: number;
  discarded: number;
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'custom';
type StatusFilter = 'all' | 'active' | 'abandoned' | 'converted' | 'discarded';

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const btnBase: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '0.8rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 500,
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'var(--color-accent)',
  color: '#fff',
  borderColor: 'var(--color-accent)',
};

const statusBadgeStyle: Record<string, React.CSSProperties> = {
  active: { background: 'rgba(40,167,69,0.1)', color: 'var(--color-success)' },
  abandoned: { background: 'rgba(255,193,7,0.1)', color: '#d4a017' },
  converted: { background: 'rgba(13,110,253,0.1)', color: '#0d6efd' },
  discarded: { background: 'rgba(108,117,125,0.1)', color: 'var(--color-text-muted)' },
};

export default function AdminLeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({ active: 0, abandoned: 0, converted: 0, discarded: 0 });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFilter === 'today') params.set('date', 'today');
      else if (dateFilter === 'yesterday') params.set('date', 'yesterday');
      else if (dateFilter === 'custom') {
        if (customFrom) params.set('from', customFrom);
        if (customTo) params.set('to', customTo);
      }
      const res = await apiFetch<{ items: Lead[]; summary: Summary }>(`/api/admin/leads?${params.toString()}`);
      setLeads(res.items);
      setSummary(res.summary);
    } catch {} finally { setLoading(false); }
  }, [dateFilter, statusFilter, customFrom, customTo]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleDiscard = async (id: string) => {
    if (!confirm('Are you sure you want to discard this lead?')) return;
    try {
      await apiFetch(`/api/admin/leads/${id}/discard`, { method: 'POST' });
      setSelectedLead(null);
      fetchLeads();
      toast('Discarded successfully', 'success');
    } catch { toast('Failed to discard lead', 'error'); }
  };

  const handleConvert = async (id: string) => {
    if (!confirm('Convert this lead to an order?')) return;
    try {
      await apiFetch(`/api/admin/leads/${id}/convert`, { method: 'POST' });
      setSelectedLead(null);
      fetchLeads();
      toast('Converted to order successfully', 'success');
    } catch { toast('Failed to convert lead', 'error'); }
  };

  const totalFiltered = leads.length;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-md)' }}>Incomplete Orders</h1>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Active: </span><strong>{summary.active}</strong>
        </div>
        <div style={{ background: '#fff', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Abandoned: </span><strong>{summary.abandoned}</strong>
        </div>
        <div style={{ background: '#fff', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Converted: </span><strong>{summary.converted}</strong>
        </div>
        {summary.discarded > 0 && (
          <div style={{ background: '#fff', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Discarded: </span><strong>{summary.discarded}</strong>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Date:</span>
          {(['all', 'today', 'yesterday', 'custom'] as DateFilter[]).map((f) => (
            <button key={f} onClick={() => setDateFilter(f)} style={dateFilter === f ? btnActive : btnBase}>
              {f === 'all' ? 'All Dates' : f === 'today' ? 'Today' : f === 'yesterday' ? 'Yesterday' : 'Custom Range'}
            </button>
          ))}
          {dateFilter === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ padding: '5px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ padding: '5px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status:</span>
          {(['all', 'active', 'abandoned', 'converted', 'discarded'] as StatusFilter[]).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)} style={statusFilter === f ? btnActive : btnBase}>
              {f === 'all' ? 'All Incomplete Orders' : f.charAt(0).toUpperCase() + f.slice(1) + (f === 'converted' ? ' to Order' : '')}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{totalFiltered} result{totalFiltered !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading...</p>
      ) : leads.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No incomplete orders found for the selected filters.</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Name</th>
                <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Phone</th>
                <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Address</th>
                <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Items</th>
                <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Created</th>
                <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const displayStatus = l.computedStatus || l.status;
                const badge = statusBadgeStyle[displayStatus] || statusBadgeStyle.active;
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px' }}>{l.name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{l.phone || '—'}{l.phone && <PhoneActions phone={l.phone} />}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{l.address || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>
                      {(l.items || []).map((item, i) => (
                        <span key={i}>
                          {item.product ? (
                            <Link href={`/product/${item.product.slug}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }} target="_blank">
                              {item.nameSnapshot}
                            </Link>
                          ) : (
                            item.nameSnapshot
                          )}
                          {item.quantity > 1 && ` x${item.quantity}`}
                          {i < l.items.length - 1 && ', '}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, ...badge }}>
                        {displayStatus === 'converted' && l.convertedOrder
                          ? `Converted (${l.convertedOrder.orderNumber})`
                          : displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{new Date(l.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => setSelectedLead(l)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {selectedLead && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setSelectedLead(null)}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)' }}>Lead Detail</h2>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div><strong>Name:</strong> {selectedLead.name || '—'}</div>
              <div><strong>Phone:</strong> {selectedLead.phone || '—'}{selectedLead.phone && <PhoneActions phone={selectedLead.phone} />}</div>
              <div><strong>Address:</strong> {selectedLead.address || '—'}</div>
              <div><strong>District/Area:</strong> {selectedLead.districtArea || '—'}</div>
              <div><strong>Delivery Method:</strong> {selectedLead.deliveryMethod || '—'}</div>
              <div><strong>Notes:</strong> {selectedLead.note || '—'}</div>
              <div><strong>Status:</strong> {(selectedLead.computedStatus || selectedLead.status).charAt(0).toUpperCase() + (selectedLead.computedStatus || selectedLead.status).slice(1)}</div>
              <div><strong>Session:</strong> {selectedLead.sessionId}</div>
              <div><strong>Created:</strong> {new Date(selectedLead.createdAt).toLocaleString()}</div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>Items</h3>
            {selectedLead.items.map((item, i) => (
              <div key={i} style={{ padding: '4px 0', fontSize: '0.9rem' }}>
                {item.product ? (
                  <Link href={`/product/${item.product.slug}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }} target="_blank">
                    {item.nameSnapshot}
                  </Link>
                ) : (
                  item.nameSnapshot
                )}
                {' '}x {item.quantity} - {formatTaka(item.unitPrice * item.quantity)}
              </div>
            ))}

            {selectedLead.convertedOrder && (
              <p style={{ marginTop: 'var(--space-md)', padding: '8px 12px', background: 'rgba(13,110,253,0.08)', borderRadius: 'var(--radius-sm)', color: '#0d6efd', fontSize: '0.9rem' }}>
                Converted to order: <strong>{selectedLead.convertedOrder.orderNumber}</strong>
              </p>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
              {(selectedLead.computedStatus || selectedLead.status) !== 'converted' && (selectedLead.computedStatus || selectedLead.status) !== 'discarded' && (
                <>
                  <button onClick={() => handleConvert(selectedLead.id)} style={{ padding: '8px 16px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    Convert to Order
                  </button>
                  <button onClick={() => handleDiscard(selectedLead.id)} style={{ padding: '8px 16px', background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    Discard
                  </button>
                </>
              )}
              <button onClick={() => setSelectedLead(null)} style={{ padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
