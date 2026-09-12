'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { CartProvider } from './lib/cart';
import { ToastProvider } from './lib/toast';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import FloatingCartButton from './components/FloatingCartButton';

const DASHBOARD_PREFIXES = ['/admin', '/moderator'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  return (
    <ToastProvider>
      <CartProvider>
        {!isDashboard && <Header />}
        <main style={{ flex: 1 }}>{children}</main>
        {!isDashboard && <Footer />}
        {!isDashboard && (
          <>
            <FloatingCartButton onClick={() => setCartDrawerOpen(true)} />
            <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
          </>
        )}
      </CartProvider>
    </ToastProvider>
  );
}
