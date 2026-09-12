'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import ConfirmModal from '../../components/ConfirmModal';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
}

interface OrderHistory {
  toStatus: string;
  createdAt: string;
  actorRole: string | null;
  note: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  districtArea: string | null;
  address: string;
  note: string | null;
  total: number;
  status: string;
  version: number;
  createdAt: string;
  items: OrderItem[];
  history: OrderHistory[];
  internalNote: string | null;
}

interface ListOrder {
  id: string;
  orderNumber: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  version: number;
  createdAt: string;
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const STATUS_COLORS: Record<string, string> = {
  New: '#007bff', Pending: '#ffc107', Connected: '#28a745', NotConnected: '#dc3545',
  Confirmed: '#17a2b8', CourierSubmitted: '#6f42c1', InProgress: '#fd7e14',
  Delivered: '#28a745', Cancelled: '#6c757d', Returned: '#dc3545',
};

const MODERATOR_TRANSITIONS: Record<string, string[]> = {
  New: ['Pending', 'Connected', 'NotConnected', 'Confirmed', 'Cancelled'],
  Pending: ['Connected', 'NotConnected', 'Confirmed', 'Cancelled'],
  Connected: ['NotConnected', 'Confirmed', 'Cancelled'],
  NotConnected: ['Pending', 'Connected', 'Confirmed', 'Cancelled'],
  Confirmed: ['CourierSubmitted'],
  CourierSubmitted: ['InProgress', 'Delivered'],
  InProgress: ['Delivered'],
};

export default function ModeratorOrdersPage() {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState<ListOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ orderId: string; toStatus: string; version: number } | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const canView = hasPermission('ORDERS_VIEW');
  const canUpdateStatus = hasPermission('ORDERS_UPDATE_STATUS');
  const canAddNote = hasPermission('ORDERS_ADD_NOTE');

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<{ items: ListOrder[] }>(`/api/admin/orders?${params}`);
      setOrders(res.items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Access denied'); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    fetchOrders();
  }, [search, statusFilter, canView]);

  const openOrder = async (orderId: string) => {
    setDetailLoading(true);
    try {
      const order = await apiFetch<Order>(`/api/admin/orders/${orderId}`);
      setSelectedOrder(order);
      setInternalNote(order.internalNote || '');
    } catch {
      alert('Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, toStatus: string, version: number) => {
    setPendingStatus({ orderId, toStatus, version });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    setStatusChanging(true);
    try {
      await apiFetch(`/api/admin/orders/${pendingStatus.orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ toStatus: pendingStatus.toStatus, version: pendingStatus.version, note: '' }),
      });
      setPendingStatus(null);
      setSelectedOrder(null);
      fetchOrders();
    } catch { alert('Failed to update status'); }
    finally { setStatusChanging(false); }
  };

  const handleSaveNote = async (orderId: string) => {
    setNoteSaving(true);
    try {
      await apiFetch(`/api/admin/orders/${orderId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: internalNote }),
      });
      setSelectedOrder(null);
      fetchOrders();
    } catch { alert('Failed to save note'); }
    finally { setNoteSaving(false); }
  };

  if (loading) return <p>Loading orders...</p>;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!canView) return <p>You do not have permission to view orders.</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Orders Queue</h1>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by phone, name, or order #" style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', maxWidth: 250, width: '100%' }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Order #</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Customer</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Total</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Status</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Age</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const age = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60));
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: '0.9rem' }}>{o.orderNumber}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.9rem' }}>{o.customerName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{o.customerPhone}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{formatTaka(o.total)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', background: `${STATUS_COLORS[o.status]}20`, color: STATUS_COLORS[o.status] }}>{o.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.85rem', color: age > 24 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                    {age}h
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => openOrder(o.id)} disabled={detailLoading} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: detailLoading ? 'wait' : 'pointer' }}>{detailLoading ? 'Loading...' : 'Process'}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setSelectedOrder(null)}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', maxWidth: 650, width: '90%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)' }}>Order {selectedOrder.orderNumber}</h2>

            <div className="grid-2" style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', background: 'var(--color-surface)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)' }}>
              <div><strong>Name:</strong> {selectedOrder.customerName}</div>
              <div><strong>Phone:</strong> <a href={`tel:${selectedOrder.customerPhone}`}>{selectedOrder.customerPhone}</a></div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {selectedOrder.address || selectedOrder.districtArea || '—'}</div>
              {selectedOrder.note && <div style={{ gridColumn: '1 / -1' }}><strong>Note:</strong> {selectedOrder.note}</div>}
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>Items</h3>
            {(selectedOrder.items || []).map((item, i) => (
              <div key={i} style={{ padding: '4px 0', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.productName} x {item.quantity}</span>
                <span>{formatTaka(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', fontWeight: 700, textAlign: 'right' }}>
              Total: {formatTaka(selectedOrder.total)}
            </div>

            {canAddNote && (
              <>
                <h3 style={{ fontSize: '1rem', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-sm)' }}>Internal Note</h3>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', resize: 'vertical', marginBottom: 'var(--space-sm)' }}
                />
                <button onClick={() => handleSaveNote(selectedOrder.id)} disabled={noteSaving} style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, marginBottom: 'var(--space-lg)' }}>
                  {noteSaving ? 'Saving...' : 'Save Note'}
                </button>
              </>
            )}

            <h3 style={{ fontSize: '1rem', marginTop: canAddNote ? 0 : 'var(--space-lg)', marginBottom: 'var(--space-sm)' }}>Status History</h3>
            {(selectedOrder.history || []).map((h, i) => (
              <div key={i} style={{ padding: '4px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {h.toStatus} - {new Date(h.createdAt).toLocaleString('bn-BD')}
                {h.note && ` - ${h.note}`}
              </div>
            ))}

            {canUpdateStatus && (
              <>
                <h3 style={{ fontSize: '1rem', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-sm)' }}>Actions</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(MODERATOR_TRANSITIONS[selectedOrder.status] || []).map((s) => (
                    <button key={s} onClick={() => handleStatusChange(selectedOrder.id, s, selectedOrder.version)} style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button onClick={() => setSelectedOrder(null)} style={{ marginTop: 'var(--space-lg)', padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {pendingStatus && (
        <ConfirmModal
          open={!!pendingStatus}
          title="Confirm Status Change"
          description={`Change order status to "${pendingStatus.toStatus}"?`}
          confirmLabel="Confirm"
          confirmColor="var(--color-accent)"
          loading={statusChanging}
          loadingLabel="Updating..."
          onConfirm={confirmStatusChange}
          onCancel={() => { if (!statusChanging) setPendingStatus(null); }}
        />
      )}
    </div>
  );
}
