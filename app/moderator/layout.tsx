'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../lib/auth';

const NAV_ITEMS = [
  { href: '/moderator', label: 'Dashboard', permission: null },
  { href: '/moderator/orders', label: 'Orders', permission: 'ORDERS_VIEW' },
  { href: '/moderator/products', label: 'Products', permission: 'PRODUCTS_VIEW' },
  { href: '/moderator/categories', label: 'Categories', permission: 'CATEGORIES_VIEW' },
  { href: '/moderator/leads', label: 'Incomplete Orders', permission: 'LEADS_VIEW' },
  { href: '/moderator/delivery', label: 'Delivery Settings', permission: 'DELIVERY_SETTINGS_VIEW' },
];

function ModeratorShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, hasPermission, refreshSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthPage = pathname === '/moderator/login' || pathname === '/moderator/change-password';

  useEffect(() => {
    if (isAuthPage) return;
    refreshSession();
  }, [pathname, isAuthPage, refreshSession]);

  useEffect(() => {
    if (loading || isAuthPage) return;
    if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
      router.push('/moderator/login');
    } else if (user.mustChangePassword && pathname !== '/moderator/change-password') {
      router.push('/moderator/change-password');
    }
  }, [loading, user, isAuthPage, pathname, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!user || (user.role !== 'moderator' && user.role !== 'admin') || user.mustChangePassword) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Redirecting...</div>;
  }

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="app-layout">
      <div className={`app-sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`app-sidebar${sidebarOpen ? ' open' : ''}`} style={{
        width: 220,
        background: 'var(--color-primary)',
        color: '#fff',
        padding: 'var(--space-lg) 0',
      }}>
        <div style={{ padding: '0 var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Moderator Panel</h2>
          <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{user.name}</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/moderator' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="mod-nav-item"
                style={{
                  padding: '10px var(--space-md)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s',
                  display: 'block',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: 'var(--space-lg) var(--space-md)', marginTop: 'auto' }}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'center',
              textDecoration: 'none',
              marginBottom: 8,
            }}
          >
            View Store
          </a>
          <button
            onClick={() => logout().then(() => router.push('/moderator/login'))}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="app-main">
        <button className="app-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
          ☰
        </button>
        {children}
      </main>
      <style>{`
        .mod-nav-item:hover {
          background: rgba(255,255,255,0.08) !important;
          color: #fff !important;
          transform: translateX(2px);
        }
        .mod-nav-item:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: -2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .mod-nav-item { transition: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ModeratorShell>{children}</ModeratorShell>
    </AuthProvider>
  );
}
