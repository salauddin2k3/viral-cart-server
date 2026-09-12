export default function PrivacyPage() {
  return (
    <div className="container page-content" style={{ padding: 'var(--space-2xl) 0', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Privacy Policy</h1>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Information We Collect</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          When you visit our checkout page, we may collect the following information before you complete your order:
          your name, phone number, delivery address, and any additional notes you provide.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Pre-Submission Checkout Capture</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          Information entered during the checkout process may be saved before you submit your order.
          This is done to provide a better shopping experience and to allow you to resume your checkout
          if you leave the page. This captured data is treated as a checkout lead and is NOT automatically
          converted into an order.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Purpose of Data Collection</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          We collect checkout information solely for the purpose of completing your order and contacting
          you regarding your purchase. We do not use this data for marketing purposes without your
          explicit consent.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Data Retention</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          Checkout information is retained for 90 days from the last update. After this period,
          personal data in abandoned checkouts is automatically anonymized or deleted.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Contact</h2>
        <p style={{ lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
          If you have questions about this privacy policy, please contact us at info@store.com.
        </p>
      </section>
    </div>
  );
}
