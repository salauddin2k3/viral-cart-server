import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--color-primary)',
      color: 'rgba(255,255,255,0.8)',
      padding: 'var(--space-2xl) 0 var(--space-lg)',
      marginTop: 'auto',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-xl)',
          marginBottom: 'var(--space-xl)',
        }}>
          <div>
            <h3 style={{ color: '#fff', marginBottom: 'var(--space-sm)', fontSize: '1.1rem' }}>Store</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
              Your trusted online shopping destination.
            </p>
          </div>

          <div>
            <h3 style={{ color: '#fff', marginBottom: 'var(--space-sm)', fontSize: '1.1rem' }}>Quick Links</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem' }}>
              <Link href="/all-products" style={{ color: 'rgba(255,255,255,0.8)' }}>All Products</Link>
              <Link href="/track" style={{ color: 'rgba(255,255,255,0.8)' }}>Track Order</Link>
            </div>
          </div>

          <div>
            <h3 style={{ color: '#fff', marginBottom: 'var(--space-sm)', fontSize: '1.1rem' }}>Legal</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem' }}>
              <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.8)' }}>Privacy Policy</Link>
              <Link href="/terms" style={{ color: 'rgba(255,255,255,0.8)' }}>Terms & Conditions</Link>
              <Link href="/returns" style={{ color: 'rgba(255,255,255,0.8)' }}>Return/Refund Policy</Link>
            </div>
          </div>

          <div>
            <h3 style={{ color: '#fff', marginBottom: 'var(--space-sm)', fontSize: '1.1rem' }}>Contact</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem' }}>
              <span>Phone: +880 1XXXXXXXXX</span>
              <span>Email: info@store.com</span>
              <span>Address: Dhaka, Bangladesh</span>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 'var(--space-md)',
          textAlign: 'center',
          fontSize: '0.85rem',
        }}>
          &copy; 2026 Store. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
