export default function ReturnsPage() {
  return (
    <div className="container page-content" style={{ padding: 'var(--space-2xl) 0', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Return & Refund Policy</h1>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Return Policy</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          We want you to be satisfied with your purchase. If you receive a damaged or defective product,
          please contact us within 7 days of delivery.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Eligibility</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          To be eligible for a return, the item must be unused and in the same condition that you
          received it. It must also be in the original packaging.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Refund Process</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          Once your return is received and inspected, we will send you an email to notify you of the
          approval or rejection of your refund. If approved, your refund will be processed within
          7-10 business days.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Contact</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          For return or refund inquiries, please contact us at info@store.com.
        </p>
      </section>
    </div>
  );
}
