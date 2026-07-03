export default function PrivacyContent() {
  return (
    <div className="space-y-8 text-sm text-[#4B5563] leading-relaxed">
      <div>
        <h3 className="text-base font-bold text-[#1B2E4B] mb-3">1. Data we collect</h3>
        <p>
          When you create an account or place an order we collect your name, email address, and
          order details (subject, academic level, deadline, and deliverables). We do not collect or
          store payment card information — this is handled exclusively by Stripe.
        </p>
      </div>

      <div>
        <h3 className="text-base font-bold text-[#1B2E4B] mb-3">2. How we use your data</h3>
        <p>
          Your data is used to fulfil your orders, send order confirmation and delivery
          notifications, and to contact you regarding your account. We do not use your data for
          automated profiling or marketing without your explicit consent.
        </p>
      </div>

      <div>
        <h3 className="text-base font-bold text-[#1B2E4B] mb-3">3. Third-party sharing</h3>
        <p>
          Your personal data is never sold to or shared with third parties for marketing purposes.
          We share data only where strictly necessary to deliver the service — for example, with
          Stripe for payment processing and with our transactional email provider for notifications.
          Both parties are bound by their own privacy policies and applicable data protection law.
        </p>
      </div>

      <div>
        <h3 className="text-base font-bold text-[#1B2E4B] mb-3">4. Cookies</h3>
        <p>
          We use essential cookies to maintain your authenticated session. No third-party tracking
          or advertising cookies are used. You can disable cookies in your browser settings, but
          this will prevent you from signing in to your account.
        </p>
      </div>

      <div>
        <h3 className="text-base font-bold text-[#1B2E4B] mb-3">5. GDPR &amp; UK data protection</h3>
        <p>
          For users in the European Union or United Kingdom, we process your personal data under
          the lawful basis of contract performance (to deliver the service you have purchased) and
          legitimate interests (account security and fraud prevention). You have the right to
          access, correct, or request deletion of your personal data at any time.
        </p>
      </div>

      <div>
        <h3 className="text-base font-bold text-[#1B2E4B] mb-3">6. Data requests &amp; contact</h3>
        <p>
          To request a copy of your data, ask for corrections, or request deletion of your account,
          please contact us at{' '}
          <a
            href="mailto:admin@getprimegrade.com"
            className="font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors"
          >
            admin@getprimegrade.com
          </a>
          . We will respond within 30 days in line with applicable data protection legislation.
        </p>
      </div>
    </div>
  )
}
