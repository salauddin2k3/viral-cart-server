'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
  BarChart, Bar,
} from 'recharts';

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
  return `৳${Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-BD', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface DashboardData {
  summary: {
    totalOrders: number;
    todayOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    returnedOrders: number;
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    totalRevenue: number;
    todayRevenue: number;
  };
  ordersByStatus: Array<{ status: string; count: number }>;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  topProducts: Array<{ name: string; totalSold: number; revenue: number; category: string }>;
  categoryPerformance: Array<{ category: string; productCount: number; totalSold: number; revenue: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    total: number;
    status: string;
    deliveryMethod: string | null;
    createdAt: string;
    items: Array<{ productName: string; quantity: number }>;
  }>;
}

type Period = '7' | '30' | '90';

const styles = {
  page: {
    padding: 'var(--space-lg)',
    maxWidth: 1400,
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    marginBottom: 'var(--space-xl)',
  } as React.CSSProperties,
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    marginBottom: 'var(--space-xs)',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-xl)',
  } as React.CSSProperties,
  summaryCard: {
    background: '#fff',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    overflow: 'hidden',
    position: 'relative' as const,
  } as React.CSSProperties,
  accentBar: (color: string) => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
    background: color,
  }) as React.CSSProperties,
  cardLabel: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    marginBottom: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  } as React.CSSProperties,
  cardValue: (color: string) => ({
    fontSize: '1.4rem',
    fontWeight: 700,
    color,
  }) as React.CSSProperties,
  periodRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-md)',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  } as React.CSSProperties,
  periodGroup: {
    display: 'inline-flex',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    padding: 3,
    gap: 2,
  } as React.CSSProperties,
  periodBtn: (active: boolean) => ({
    padding: '6px 16px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
    background: active ? '#fff' : 'transparent',
    color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }) as React.CSSProperties,
  chartRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-xl)',
  } as React.CSSProperties,
  chartCard: {
    background: '#fff',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    padding: 'var(--space-lg)',
  } as React.CSSProperties,
  chartTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: 'var(--space-md)',
  } as React.CSSProperties,
  emptyMsg: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.85rem',
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    borderBottom: '2px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  } as React.CSSProperties,
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#fff',
    background: color,
  }) as React.CSSProperties,
  viewAll: {
    display: 'inline-block',
    marginTop: 'var(--space-md)',
    color: 'var(--color-accent)',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
  } as React.CSSProperties,
  skeleton: {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 'var(--radius-sm)',
  } as React.CSSProperties,
  errorBox: {
    background: '#fff5f5',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-lg)',
    color: 'var(--color-danger)',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  catHeaderRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '8px 12px',
    borderBottom: '2px solid var(--color-border)',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    overflowX: 'auto' as const,
  } as React.CSSProperties,
  catRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '8px 12px',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.85rem',
    color: 'var(--color-text)',
    overflowX: 'auto' as const,
  } as React.CSSProperties,
};

const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

function SkeletonCard() {
  return (
    <div style={{ ...styles.summaryCard }}>
      <div style={{ ...styles.skeleton, width: 4, height: 48, borderRadius: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ ...styles.skeleton, width: '60%', height: 12, marginBottom: 8 }} />
        <div style={{ ...styles.skeleton, width: '40%', height: 22 }} />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div style={styles.chartCard}>
      <div style={{ ...styles.skeleton, width: '30%', height: 16, marginBottom: 16 }} />
      <div style={{ ...styles.skeleton, width: '100%', height: 220 }} />
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('7');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<DashboardData>(
        `/api/admin/analytics?period=${period}`,
      );
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;

  const summaryCards = [
    { label: 'Total Revenue', value: summary ? formatTaka(summary.totalRevenue) : '৳0', color: 'var(--color-accent)' },
    { label: "Today's Orders", value: summary?.todayOrders ?? 0, color: 'var(--color-primary)' },
    { label: 'Total Orders', value: summary?.totalOrders ?? 0, color: '#3b82f6' },
    { label: 'Pending Orders', value: summary?.pendingOrders ?? 0, color: 'var(--color-warning)' },
    { label: 'Delivered Orders', value: summary?.deliveredOrders ?? 0, color: 'var(--color-success)' },
    { label: 'Active Products', value: summary?.activeProducts ?? 0, color: '#8b5cf6' },
  ];

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Overview of your store performance</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p style={{ marginBottom: 8, fontWeight: 600 }}>Failed to load dashboard</p>
            <p style={{ fontSize: '0.85rem' }}>{error}</p>
            <button
              onClick={fetchData}
              style={{
                marginTop: 12,
                padding: '6px 16px',
                background: 'var(--color-danger)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div style={styles.summaryGrid}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : summaryCards.map((card) => (
                <div key={card.label} style={styles.summaryCard}>
                  <div style={styles.accentBar(card.color)} />
                  <div style={{ flex: 1, marginLeft: 4 }}>
                    <p style={styles.cardLabel}>{card.label}</p>
                    <p style={styles.cardValue(card.color)}>{card.value}</p>
                  </div>
                </div>
              ))}
        </div>

        {/* Period Selector */}
        <div style={styles.periodRow}>
          <h2 style={styles.sectionTitle}>Revenue & Orders Trend</h2>
          <div style={styles.periodGroup}>
            {(['7', '30', '90'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={styles.periodBtn(period === p)}
              >
                {p} Days
              </button>
            ))}
          </div>
        </div>

        {/* Charts Row 1: Revenue Trend + Orders by Status */}
        <div style={styles.chartRow}>
          {loading ? (
            <><SkeletonChart /><SkeletonChart /></>
          ) : (
            <>
              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>Revenue Trend</p>
                {data?.revenueByDay && data.revenueByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data.revenueByDay} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value) => [formatTaka(Number(value)), 'Revenue']}
                        labelFormatter={(label) => formatDate(String(label))}
                        contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)', fontSize: '0.8rem' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--color-accent)"
                        strokeWidth={2}
                        fill="url(#revenueGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={styles.emptyMsg}>No revenue data available</div>
                )}
              </div>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>Orders by Status</p>
                {data?.ordersByStatus && data.ordersByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.ordersByStatus}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="count"
                        nameKey="status"
                        paddingAngle={2}
                      >
                        {data.ordersByStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.status] || '#6b7280'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)', fontSize: '0.8rem' }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={styles.emptyMsg}>No status data available</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Charts Row 2: Order Trend + Top Products */}
        <div style={styles.chartRow}>
          {loading ? (
            <><SkeletonChart /><SkeletonChart /></>
          ) : (
            <>
              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>Order Trend</p>
                {data?.revenueByDay && data.revenueByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.revenueByDay} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        formatter={(value) => [value, 'Orders']}
                        labelFormatter={(label) => formatDate(String(label))}
                        contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)', fontSize: '0.8rem' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: 'var(--color-primary)' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={styles.emptyMsg}>No order data available</div>
                )}
              </div>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>Top Products</p>
                {data?.topProducts && data.topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={data.topProducts.slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        width={120}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'totalSold') return [value, 'Quantity Sold'];
                          if (name === 'revenue') return [formatTaka(Number(value)), 'Revenue'];
                          return [value, name];
                        }}
                        contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)', fontSize: '0.8rem' }}
                      />
                      <Bar dataKey="totalSold" fill="var(--color-accent)" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={styles.emptyMsg}>No product data available</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Category Performance */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={styles.periodRow}>
            <h2 style={styles.sectionTitle}>Category Performance</h2>
          </div>
          {loading ? (
            <SkeletonChart />
          ) : data?.categoryPerformance && data.categoryPerformance.length > 0 ? (
            <div style={styles.chartCard}>
              <div style={styles.catHeaderRow}>
                <span>Category</span>
                <span style={{ textAlign: 'right' }}>Products</span>
                <span style={{ textAlign: 'right' }}>Sold</span>
                <span style={{ textAlign: 'right' }}>Revenue</span>
              </div>
              {data.categoryPerformance.map((cat) => (
                <div key={cat.category} style={styles.catRow}>
                  <span style={{ fontWeight: 500 }}>{cat.category}</span>
                  <span style={{ textAlign: 'right' }}>{cat.productCount}</span>
                  <span style={{ textAlign: 'right' }}>{cat.totalSold}</span>
                  <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatTaka(cat.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.chartCard}>
              <div style={styles.emptyMsg}>No category data available</div>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={styles.periodRow}>
            <h2 style={styles.sectionTitle}>Recent Orders</h2>
            <a href="/admin/orders" style={styles.viewAll}>View All →</a>
          </div>
          {loading ? (
            <SkeletonChart />
          ) : data?.recentOrders && data.recentOrders.length > 0 ? (
            <div style={styles.chartCard}>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Order #</th>
                      <th style={styles.th}>Customer</th>
                      <th style={styles.th}>Items</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.slice(0, 8).map((order) => (
                      <tr key={order.id}>
                        <td style={{ ...styles.td, fontWeight: 500 }}>{order.orderNumber}</td>
                        <td style={styles.td}>
                          <div>{order.customerName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{order.customerPhone}</div>
                        </td>
                        <td style={{ ...styles.td, maxWidth: 160 }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {order.items.map((it) => `${it.productName} ×${it.quantity}`).join(', ')}
                          </div>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{formatTaka(order.total)}</td>
                        <td style={styles.td}>
                          <span style={styles.badge(STATUS_COLORS[order.status] || '#6b7280')}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {new Date(order.createdAt).toLocaleDateString('en-BD', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={styles.chartCard}>
              <div style={styles.emptyMsg}>No recent orders</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
