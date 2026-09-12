'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
  BarChart, Bar,
} from 'recharts';

interface Summary {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalRevenue: number;
  todayRevenue: number;
}

interface OrderByStatus {
  status: string;
  count: number;
}

interface RevenueByDay {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  totalSold: number;
  revenue: number;
  category: string;
}

interface CategoryPerf {
  category: string;
  productCount: number;
  totalSold: number;
  revenue: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  deliveryMethod: string | null;
  createdAt: string;
  items: Array<{ productName: string; quantity: number }>;
}

interface AnalyticsData {
  summary?: Summary;
  ordersByStatus?: OrderByStatus[];
  revenueByDay?: RevenueByDay[];
  topProducts?: TopProduct[];
  categoryPerformance?: CategoryPerf[];
  recentOrders?: RecentOrder[];
}

const STATUS_COLORS: Record<string, string> = {
  New: '#3b82f6',
  Pending: '#f59e0b',
  Connected: '#10b981',
  NotConnected: '#ef4444',
  Confirmed: '#06b6d4',
  CourierSubmitted: '#8b5cf6',
  InProgress: '#f97316',
  Delivered: '#22c55e',
  Cancelled: '#6b7280',
  Returned: '#ef4444',
};

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '0 0 var(--space-2xl)' },
  header: { fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-lg)' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--color-text)' },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-xl)',
  },
  card: {
    background: '#fff',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
  },
  cardLabel: { color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 4 },
  cardValue: { fontSize: '1.5rem', fontWeight: 700 },
  chartRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-xl)',
  },
  chartBox: {
    background: '#fff',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
  },
  chartTitle: { fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  th: {
    background: 'var(--color-surface)',
    padding: 'var(--space-sm) var(--space-md)',
    textAlign: 'left' as const,
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    borderBottom: '2px solid var(--color-border)',
  },
  td: {
    padding: 'var(--space-sm) var(--space-md)',
    fontSize: '0.9rem',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle' as const,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: 'var(--space-2xl)',
    color: 'var(--color-text-muted)',
    fontSize: '1rem',
  },
  periodBar: {
    display: 'flex',
    gap: 'var(--space-sm)',
    marginBottom: 'var(--space-lg)',
    flexWrap: 'wrap' as const,
  },
};

function badgeStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#fff',
    background: color || '#6b7280',
  };
}

function periodBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 16px',
    borderRadius: 'var(--radius-sm)',
    border: active ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
    background: active ? 'var(--color-primary)' : '#fff',
    color: active ? '#fff' : 'var(--color-text)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
  };
}

const responsiveStyle = `
  @media (max-width: 768px) {
    .mod-chart-row {
      grid-template-columns: 1fr !important;
    }
  }
`;

export default function ModeratorDashboardPage() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const canViewOrders = hasPermission('ORDERS_VIEW');
  const canViewProducts = hasPermission('PRODUCTS_VIEW');
  const canViewCategories = hasPermission('CATEGORIES_VIEW');
  const hasAnyPermission = canViewOrders || canViewProducts || canViewCategories;

  useEffect(() => {
    if (!hasAnyPermission) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<AnalyticsData>(`/api/admin/analytics/moderator?period=${period}`);
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [period, hasAnyPermission]);

  const pieData = useMemo(() => {
    if (!data?.ordersByStatus) return [];
    return data.ordersByStatus.map((item) => ({
      name: item.status,
      value: item.count,
      color: STATUS_COLORS[item.status] || '#6b7280',
    }));
  }, [data?.ordersByStatus]);

  if (!hasAnyPermission) {
    return (
      <div style={styles.page}>
        <h1 style={styles.header}>Moderator Dashboard</h1>
        <div style={styles.emptyState}>
          No dashboard data available. Contact admin for permissions.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <h1 style={styles.header}>Moderator Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <h1 style={styles.header}>Moderator Dashboard</h1>
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{responsiveStyle}</style>
      <h1 style={styles.header}>Moderator Dashboard</h1>

      {/* Period Selector */}
      <div style={styles.periodBar}>
        {(['7d', '30d', '90d', 'all'] as const).map((p) => (
          <button key={p} style={periodBtnStyle(period === p)} onClick={() => setPeriod(p)}>
            {p === 'all' ? 'All Time' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
          </button>
        ))}
      </div>

      {/* ORDERS_VIEW Sections */}
      {canViewOrders && data?.summary && (
        <SummaryCards summary={data.summary} />
      )}

      {canViewOrders && (data?.revenueByDay || data?.ordersByStatus) && (
        <div style={styles.chartRow} className="mod-chart-row">
          {data?.revenueByDay && data.revenueByDay.length > 0 && (
            <div style={styles.chartBox}>
              <h3 style={styles.chartTitle}>Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.revenueByDay}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a1a2e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1a1a2e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)' }}
                    formatter={((value: number) => [formatTaka(value), 'Revenue']) as any}
                    labelFormatter={((label: string) => new Date(label).toLocaleDateString('en-BD')) as any}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#1a1a2e" fill="url(#revenueGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {data?.ordersByStatus && data.ordersByStatus.length > 0 && (
            <div style={styles.chartBox}>
              <h3 style={styles.chartTitle}>Orders by Status</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)' }}
                  />
                  <Legend
                    formatter={(value: string) => <span style={{ fontSize: '0.85rem' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Order Trend */}
      {canViewOrders && data?.revenueByDay && data.revenueByDay.length > 0 && (
        <div style={{ ...styles.chartBox, marginBottom: 'var(--space-xl)' }}>
          <h3 style={styles.chartTitle}>Order Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)' }}
                labelFormatter={((label: string) => new Date(label).toLocaleDateString('en-BD')) as any}
              />
              <Line type="monotone" dataKey="orders" stroke="#e94560" strokeWidth={2} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* PRODUCTS_VIEW Sections */}
      {canViewProducts && data?.topProducts && data.topProducts.length > 0 && (
        <div style={{ ...styles.chartBox, marginBottom: 'var(--space-xl)' }}>
          <h3 style={styles.chartTitle}>Top Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topProducts.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(v: string) => (v.length > 20 ? v.slice(0, 20) + '...' : v)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)' }}
                formatter={((value: number) => [formatTaka(value), 'Revenue']) as any}
              />
              <Bar dataKey="revenue" fill="#1a1a2e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Product Summary Cards */}
      {canViewProducts && data?.topProducts && data.topProducts.length > 0 && (
        <div style={styles.cardGrid}>
          {[
            { label: 'Top Selling', value: data.topProducts[0]?.name || '-', color: 'var(--color-primary)' },
            { label: 'Total Products Sold', value: data.topProducts.reduce((s, p) => s + p.totalSold, 0), color: 'var(--color-accent)' },
            { label: 'Product Categories', value: new Set(data.topProducts.map((p) => p.category)).size, color: 'var(--color-success)' },
            { label: 'Top Product Revenue', value: formatTaka(data.topProducts[0]?.revenue || 0), color: 'var(--color-primary)' },
          ].map((card) => (
            <div key={card.label} style={styles.card}>
              <p style={styles.cardLabel}>{card.label}</p>
              <p style={{ ...styles.cardValue, color: card.color, fontSize: typeof card.value === 'string' && card.value.length > 15 ? '1rem' : '1.5rem' }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* CATEGORIES_VIEW Section */}
      {canViewCategories && data?.categoryPerformance && data.categoryPerformance.length > 0 && (
        <div style={styles.chartRow} className="mod-chart-row">
          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>Category Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)' }}
                  formatter={((value: number, name: string) => [
                    name === 'revenue' ? formatTaka(value) : value,
                    name === 'revenue' ? 'Revenue' : 'Sold',
                  ]) as any}
                />
                <Bar dataKey="revenue" fill="#1a1a2e" radius={[4, 4, 0, 0]} name="revenue" />
                <Bar dataKey="totalSold" fill="#e94560" radius={[4, 4, 0, 0]} name="totalSold" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>Category Performance</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...styles.table, boxShadow: 'none' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>Category</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Products</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Sold</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryPerformance.map((cat) => (
                    <tr key={cat.category}>
                      <td style={styles.td}>{cat.category}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{cat.productCount}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{cat.totalSold}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{formatTaka(cat.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders Table */}
      {canViewOrders && data?.recentOrders && data.recentOrders.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={styles.sectionTitle}>Recent Orders</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Order #</th>
                  <th style={styles.th}>Customer</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Items</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Delivery</th>
                  <th style={{ ...styles.th }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{order.orderNumber}</td>
                    <td style={styles.td}>
                      <div>{order.customerName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{order.customerPhone}</div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {order.items.map((item) => item.quantity).reduce((a, b) => a + b, 0)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{formatTaka(order.total)}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={badgeStyle(STATUS_COLORS[order.status] || '#6b7280')}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', fontSize: '0.85rem' }}>
                      {order.deliveryMethod || '-'}
                    </td>
                    <td style={{ ...styles.td, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: Summary }) {
  const cards = [
    { label: 'Total Revenue', value: formatTaka(summary.totalRevenue), color: 'var(--color-primary)' },
    { label: "Today's Revenue", value: formatTaka(summary.todayRevenue), color: 'var(--color-accent)' },
    { label: "Today's Orders", value: summary.todayOrders, color: 'var(--color-accent)' },
    { label: 'Total Orders', value: summary.totalOrders, color: 'var(--color-primary)' },
    { label: 'Pending', value: summary.pendingOrders, color: 'var(--color-warning)' },
    { label: 'Delivered', value: summary.deliveredOrders, color: 'var(--color-success)' },
    { label: 'Cancelled', value: summary.cancelledOrders, color: 'var(--color-danger)' },
    { label: 'Returned', value: summary.returnedOrders, color: '#6b7280' },
  ];

  return (
    <div style={styles.cardGrid}>
      {cards.map((card) => (
        <div key={card.label} style={styles.card}>
          <p style={styles.cardLabel}>{card.label}</p>
          <p style={{ ...styles.cardValue, color: card.color }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
