'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import PhoneActions from '../../components/PhoneActions';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  sku: string;
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
  deliveryLocation: string | null;
  deliveryMethod: string | null;
  address: string;
  note: string | null;
  total: number;
  status: string;
  paymentStatus: string;
  version: number;
  createdAt: string;
  items: OrderItem[];
  history: OrderHistory[];
  internalNote: string | null;
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const STATUS_COLORS: Record<string, string> = {
  New: '#007bff', Pending: '#ffc107', Connected: '#28a745', NotConnected: '#dc3545',
  Confirmed: '#17a2b8', CourierSubmitted: '#6f42c1', InProgress: '#fd7e14',
  Delivered: '#28a745', Cancelled: '#6c757d', Returned: '#dc3545',
};

const ALL_STATUSES = Object.keys(STATUS_COLORS);

const TRANSITIONS: Record<string, string[]> = {
  New: ['Pending', 'Connected', 'NotConnected', 'Confirmed', 'Cancelled'],
  Pending: ['Connected', 'NotConnected', 'Confirmed', 'Cancelled'],
  Connected: ['NotConnected', 'Confirmed', 'Cancelled'],
  NotConnected: ['Pending', 'Connected', 'Confirmed', 'Cancelled'],
  Confirmed: ['CourierSubmitted', 'Cancelled'],
  CourierSubmitted: ['InProgress', 'Delivered', 'Returned'],
  InProgress: ['Delivered', 'Returned'],
  Delivered: ['Returned'],
};

type DateFilter = 'all' | 'today' | 'yesterday' | 'custom';
type SortOption = 'createdAt_desc' | 'createdAt_asc' | 'total_desc' | 'total_asc' | 'status_asc';

const BD_TZ_OFFSET = -360;

function getBDDateParts(): { year: number; month: number; day: number } {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const bdMs = utcMs - BD_TZ_OFFSET * 60_000;
  const bd = new Date(bdMs);
  return { year: bd.getFullYear(), month: bd.getMonth(), day: bd.getDate() };
}

function formatBDDate(d: Date): string {
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  const bdMs = utcMs - BD_TZ_OFFSET * 60_000;
  const bd = new Date(bdMs);
  const y = bd.getFullYear();
  const m = String(bd.getMonth() + 1).padStart(2, '0');
  const day = String(bd.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayStr(): string {
  const { year, month, day } = getBDDateParts();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getYesterdayStr(): string {
  const { year, month, day } = getBDDateParts();
  const d = new Date(year, month, day - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateBarcodeSvg(text: string, width: number, height: number): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const bars: string[] = [];
  const barCount = 40;
  let seed = Math.abs(hash);
  for (let i = 0; i < barCount; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = (seed % 2) + 1;
    const bw = (w * width) / (barCount * 2);
    const x = (i * width) / barCount;
    bars.push(`<rect x="${x}" y="0" width="${bw}" height="${height}" fill="#000"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 14}" viewBox="0 0 ${width} ${height + 14}">${bars.join('')}<text x="${width / 2}" y="${height + 12}" text-anchor="middle" font-size="8" font-family="monospace" fill="#000">${text}</text></svg>`;
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

function ShippingLabel({ order }: { order: Order | { orderNumber: string; trackingCode: string; customerName: string; customerPhone: string; districtArea: string | null; address: string; total: number; createdAt: string; paymentStatus: string; items: Array<{ productName: string; quantity: number; unitPrice: number }> } }) {
  const barcodeSvg = generateBarcodeSvg(order.orderNumber, 200, 30);
  const itemTotal = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const paymentLabel = order.paymentStatus === 'Paid' ? 'PAID' : 'COD';

  return (
    <div style={{ width: '3in', height: '3in', border: '1.5px solid #000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', pageBreakInside: 'avoid', marginBottom: 8, color: '#000', lineHeight: 1.3 }}>
      {/* Header */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px' }}>E-Commerce Store</div>
          <div style={{ fontSize: '7px', opacity: 0.75, marginTop: 1 }}>Dhaka, Bangladesh</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '8px', opacity: 0.7 }}>Order</div>
          <div style={{ fontSize: '11px', fontWeight: 700 }}>{order.orderNumber}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 10px', gap: 4 }}>
        {/* Ship To */}
        <div>
          <div style={{ fontSize: '7px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Ship To</div>
          <div style={{ fontWeight: 700, fontSize: '10.5px' }}>{order.customerName}</div>
          <div style={{ fontSize: '9px' }}>{order.customerPhone}</div>
          <div style={{ fontSize: '8.5px', marginTop: 1 }}>{order.address}</div>
          {order.districtArea && <div style={{ fontSize: '8px', color: '#444' }}>{order.districtArea}</div>}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed #ccc', margin: '2px 0' }} />

        {/* Items */}
        <div>
          <div style={{ fontSize: '7px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Items ({itemTotal})</div>
          {order.items.slice(0, 3).map((item, i) => (
            <div key={i} style={{ fontSize: '8.5px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{item.productName} x{item.quantity}</span>
              <span style={{ fontWeight: 600 }}>{formatTaka(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <div style={{ fontSize: '7.5px', color: '#666', marginTop: 1 }}>+{order.items.length - 3} more item{order.items.length - 3 > 1 ? 's' : ''}</div>
          )}
        </div>

        {/* Footer info row */}
        <div style={{ borderTop: '1px dashed #ccc', margin: '2px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '7px', color: '#555' }}>Date: {orderDate}</div>
            {order.trackingCode && <div style={{ fontSize: '7px', color: '#555' }}>Track: {order.trackingCode}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '7px', color: '#555' }}>Total</div>
            <div style={{ fontSize: '11px', fontWeight: 800 }}>{formatTaka(order.total)}</div>
            <div style={{ fontSize: '7px', fontWeight: 700, color: paymentLabel === 'PAID' ? '#28a745' : '#856404', background: paymentLabel === 'PAID' ? '#d4edda' : '#fff3cd', padding: '1px 4px', borderRadius: 2, display: 'inline-block' }}>{paymentLabel}</div>
          </div>
        </div>
      </div>

      {/* Barcode footer */}
      <div style={{ borderTop: '1px solid #000', padding: '3px 10px 4px', display: 'flex', justifyContent: 'center' }}>
        <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
      </div>
    </div>
  );
}

function buildExcelContent(filteredOrders: Order[]): string {
  const header = ['Order #', 'Date', 'Customer Name', 'Phone', 'Address', 'District', 'Items', 'Qty', 'Total', 'Status', 'Payment'];
  const rows = filteredOrders.map((o) => [
    o.orderNumber,
    new Date(o.createdAt).toLocaleString(),
    o.customerName,
    o.customerPhone,
    o.address,
    o.districtArea || '',
    o.items.map((i) => i.productName).join('; '),
    o.items.reduce((sum, i) => sum + i.quantity, 0).toString(),
    Number(o.total).toFixed(2),
    o.status,
    o.paymentStatus || 'Pending',
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ orderId: string; toStatus: string; version: number } | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt_desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkPrint, setShowBulkPrint] = useState(false);

  const fetchOrders = useCallback(async (isFilterChange = false) => {
    if (isFilterChange) {
      setFilterLoading(true);
    }
    try {
      const params = new URLSearchParams({ limit: '100', tzOffset: String(BD_TZ_OFFSET) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFilter === 'today') {
        params.set('from', getTodayStr());
        params.set('to', getTodayStr());
      } else if (dateFilter === 'yesterday') {
        params.set('from', getYesterdayStr());
        params.set('to', getYesterdayStr());
      } else if (dateFilter === 'custom') {
        if (customFrom) params.set('from', customFrom);
        if (customTo) params.set('to', customTo);
      }
      params.set('sort', sortBy);
      const res = await apiFetch<{ items: Order[] }>(`/api/admin/orders?${params}`);
      setOrders(res.items);
      setSelectedIds(new Set());
    } catch {} finally {
      setInitialLoading(false);
      setFilterLoading(false);
    }
  }, [search, statusFilter, dateFilter, customFrom, customTo, sortBy]);

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  const handleViewOrder = async (orderId: string) => {
    setDetailLoading(true);
    try {
      const order = await apiFetch<Order>(`/api/admin/orders/${orderId}`);
      setSelectedOrder(order);
      setInternalNote(order.internalNote || '');
    } catch {
      alert('Failed to load order details');
    } finally { setDetailLoading(false); }
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
      fetchOrders(true);
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
      fetchOrders(true);
    } catch { alert('Failed to save note'); }
    finally { setNoteSaving(false); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id));

  const printLabels = (orderList: Array<Order | { orderNumber: string; trackingCode: string; customerName: string; customerPhone: string; districtArea: string | null; address: string; total: number; createdAt: string; paymentStatus: string; items: Array<{ productName: string; quantity: number; unitPrice: number }> }>) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }

    const labelStyles = 'width:3in;height:3in;border:1.5px solid #000;font-family:Arial,Helvetica,sans-serif;font-size:9px;display:flex;flex-direction:column;box-sizing:border-box;color:#000;line-height:1.3;margin:0;padding:0;';
    const headerBar = (orderNum: string) => `<div style="background:#1a1a2e;color:#fff;padding:6px 10px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:800;letter-spacing:0.5px;">E-Commerce Store</div><div style="font-size:7px;opacity:0.75;margin-top:1px;">Dhaka, Bangladesh</div></div><div style="text-align:right;"><div style="font-size:8px;opacity:0.7;">Order</div><div style="font-size:11px;font-weight:700;">${orderNum}</div></div></div>`;
    const barcodeSvg = (text: string) => {
      let hash = 0;
      for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
      const bars: string[] = [];
      let seed = Math.abs(hash);
      for (let i = 0; i < 40; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const w = (seed % 2) + 1;
        const bw = (w * 200) / 80;
        const x = (i * 200) / 40;
        bars.push(`<rect x="${x}" y="0" width="${bw}" height="30" fill="#000"/>`);
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="44" viewBox="0 0 200 44">${bars.join('')}<text x="100" y="42" text-anchor="middle" font-size="8" font-family="monospace" fill="#000">${text}</text></svg>`;
    };

    const labelHtml = (o: typeof orderList[0]) => {
      const paymentLabel = o.paymentStatus === 'Paid' ? 'PAID' : 'COD';
      const paymentColor = paymentLabel === 'PAID' ? '#28a745' : '#856404';
      const paymentBg = paymentLabel === 'PAID' ? '#d4edda' : '#fff3cd';
      const orderDate = new Date(o.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const itemTotal = o.items.reduce((s, i) => s + i.quantity, 0);
      const itemsHtml = o.items.slice(0, 3).map((item) => `<div style="font-size:8.5px;display:flex;justify-content:space-between;"><span>${item.productName} x${item.quantity}</span><span style="font-weight:600;">${formatTaka(item.unitPrice * item.quantity)}</span></div>`).join('');
      const moreHtml = o.items.length > 3 ? `<div style="font-size:7.5px;color:#666;margin-top:1px;">+${o.items.length - 3} more item${o.items.length - 3 > 1 ? 's' : ''}</div>` : '';
      return `<div style="${labelStyles}">${headerBar(o.orderNumber)}<div style="flex:1;display:flex;flex-direction:column;padding:6px 10px;gap:4px;"><div><div style="font-size:7px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Ship To</div><div style="font-weight:700;font-size:10.5px;">${o.customerName}</div><div style="font-size:9px;">${o.customerPhone}</div><div style="font-size:8.5px;margin-top:1px;">${o.address}</div>${o.districtArea ? `<div style="font-size:8px;color:#444;">${o.districtArea}</div>` : ''}</div><div style="border-top:1px dashed #ccc;margin:2px 0;"></div><div><div style="font-size:7px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Items (${itemTotal})</div>${itemsHtml}${moreHtml}</div><div style="border-top:1px dashed #ccc;margin:2px 0;"></div><div style="display:flex;justify-content:space-between;align-items:flex-end;"><div><div style="font-size:7px;color:#555;">Date: ${orderDate}</div>${o.trackingCode ? `<div style="font-size:7px;color:#555;">Track: ${o.trackingCode}</div>` : ''}</div><div style="text-align:right;"><div style="font-size:7px;color:#555;">Total</div><div style="font-size:11px;font-weight:800;">${formatTaka(o.total)}</div><div style="font-size:7px;font-weight:700;color:${paymentColor};background:${paymentBg};padding:1px 4px;border-radius:2px;display:inline-block;">${paymentLabel}</div></div></div></div><div style="border-top:1px solid #000;padding:3px 10px 4px;display:flex;justify-content:center;">${barcodeSvg(o.orderNumber)}</div></div>`;
    };

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>@media print{body{margin:0;}@page{size:3in 3in;margin:0.1in;}}</style></head><body style="margin:0;padding:0;">${orderList.map((o) => `<div style="page-break-after:always;margin:0;padding:0;">${labelHtml(o)}</div>`).join('')}</body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 400);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.size > 0 ? selectedOrders : orders;
    const csv = buildExcelContent(dataToExport);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`orders-${date}.csv`, csv);
  };

  const handlePrintSingle = (order: Order) => {
    printLabels([order]);
  };

  const handleBulkPrint = () => {
    if (selectedOrders.length === 0) return;
    printLabels(selectedOrders);
    setShowBulkPrint(false);
  };

  if (initialLoading) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Orders</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
          <span style={{ marginRight: 8, display: 'inline-block', width: 18, height: 18, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          Loading orders...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Orders</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedIds.size > 0 && (
            <button onClick={() => setShowBulkPrint(true)} style={{ ...btnBase, background: 'var(--color-success)', color: '#fff', borderColor: 'var(--color-success)' }}>
              Print Labels ({selectedIds.size})
            </button>
          )}
          <button onClick={handleExport} style={{ ...btnBase, background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' }}>
            Export {selectedIds.size > 0 ? `Selected (${selectedIds.size})` : 'All'} to CSV
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by phone, name, or order #" style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', maxWidth: 250, width: '100%', fontSize: '0.85rem' }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="total_desc">Highest Total</option>
            <option value="total_asc">Lowest Total</option>
            <option value="status_asc">Status A-Z</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div style={{ position: 'relative', background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        {filterLoading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 'var(--radius-md)' }}>
            <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          </div>
        )}
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem', width: 36 }}>
                <input type="checkbox" checked={selectedIds.size === orders.length && orders.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
              </th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Order #</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Customer</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Items</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Total</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Status</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Date</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)', background: selectedIds.has(o.id) ? 'rgba(0,123,255,0.03)' : undefined }}>
                <td style={{ padding: '10px 12px' }}>
                  <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelect(o.id)} style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: '0.9rem' }}>{o.orderNumber}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.9rem' }}>{o.customerName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>{o.customerPhone}<PhoneActions phone={o.customerPhone} /></div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>
                  {(o.items || []).map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{formatTaka(o.total)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', background: `${STATUS_COLORS[o.status]}20`, color: STATUS_COLORS[o.status] }}>
                    {o.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
                  <button onClick={() => handleViewOrder(o.id)} disabled={detailLoading} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: detailLoading ? 'wait' : 'pointer' }}>
                    View
                  </button>
                  <button onClick={() => handlePrintSingle(o)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                    Print
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>No orders found</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setSelectedOrder(null)}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h2 style={{ fontSize: '1.2rem' }}>Order {selectedOrder.orderNumber}</h2>
              <button onClick={() => handlePrintSingle(selectedOrder)} style={{ ...btnBase, fontSize: '0.8rem' }}>Print Label</button>
            </div>
            <div className="grid-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <div><strong>Customer:</strong> {selectedOrder.customerName}</div>
              <div><strong>Phone:</strong> {selectedOrder.customerPhone} <PhoneActions phone={selectedOrder.customerPhone} /></div>
              <div><strong>Address:</strong> {selectedOrder.address}</div>
              {selectedOrder.districtArea && <div><strong>District:</strong> {selectedOrder.districtArea}</div>}
              <div><strong>Total:</strong> {formatTaka(selectedOrder.total)}</div>
              <div><strong>Status:</strong> <span style={{ color: STATUS_COLORS[selectedOrder.status] }}>{selectedOrder.status}</span></div>
              <div><strong>Payment:</strong> {selectedOrder.paymentStatus || 'Pending'}</div>
              {selectedOrder.trackingCode && <div><strong>Tracking:</strong> {selectedOrder.trackingCode}</div>}
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>Items</h3>
            {(selectedOrder.items || []).map((item, i) => (
              <div key={i} style={{ padding: '4px 0', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.productName} x {item.quantity} {item.sku && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>({item.sku})</span>}</span>
                <span style={{ fontWeight: 600 }}>{formatTaka(item.lineTotal)}</span>
              </div>
            ))}

            <h3 style={{ fontSize: '1rem', marginTop: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>Internal Note</h3>
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

            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>Status History</h3>
            {(selectedOrder.history || []).map((h, i) => (
              <div key={i} style={{ padding: '4px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {h.toStatus} - {new Date(h.createdAt).toLocaleString('bn-BD')}
                {h.note && ` - ${h.note}`}
              </div>
            ))}

            <h3 style={{ fontSize: '1rem', marginTop: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>Actions</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(TRANSITIONS[selectedOrder.status] || []).map((s) => (
                <button key={s} onClick={() => handleStatusChange(selectedOrder.id, s, selectedOrder.version)} style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>

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

      {showBulkPrint && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowBulkPrint(false)}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', maxWidth: 420, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Print Shipping Labels</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
              Print shipping labels for {selectedOrders.length} selected order{selectedOrders.length !== 1 ? 's' : ''}. Each label is 3×3 inches.
            </p>
            <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 'var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
              {selectedOrders.map((o) => (
                <div key={o.id} style={{ padding: '4px 0', fontSize: '0.85rem', borderBottom: '1px solid var(--color-border)' }}>
                  <strong>{o.orderNumber}</strong> — {o.customerName} ({o.customerPhone})
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBulkPrint(false)} style={{ ...btnBase }}>Cancel</button>
              <button onClick={handleBulkPrint} style={{ ...btnBase, background: 'var(--color-success)', color: '#fff', borderColor: 'var(--color-success)' }}>Print {selectedOrders.length} Label{selectedOrders.length !== 1 ? 's' : ''}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
