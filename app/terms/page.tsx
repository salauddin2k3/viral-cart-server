export default function TermsPage() {
  return (
    <div className="container page-content" style={{ padding: 'var(--space-2xl) 0', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Terms & Conditions</h1>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>General Terms</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          By using our website and placing an order, you agree to these terms and conditions.
          Please read them carefully before making a purchase.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Orders</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          All orders are subject to acceptance and availability. We reserve the right to refuse
          or cancel any order for any reason. Prices are subject to change without notice.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Payment</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          Currently, we accept Cash on Delivery (COD) only. Payment is due at the time of delivery.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Contact</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          For any questions regarding these terms, please contact us at info@store.com.
        </p>
      </section>
    </div>
  );
}
