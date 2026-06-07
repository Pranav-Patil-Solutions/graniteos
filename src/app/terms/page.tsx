import LegalDoc from "@/components/legal/LegalDoc";

export const metadata = { title: "Terms of Service · GraniteOS" };

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" updated="7 June 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of GraniteOS (the
        &quot;Service&quot;), a software platform for managing granite and marble businesses, operated
        by Vyaparwerk (&quot;we&quot;, &quot;us&quot;). By creating an account or using the Service, you
        agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        GraniteOS provides tools to manage stock, customers, suppliers, quotations, orders, invoicing,
        payments, fabrication and marketing for stone businesses. We may add, change or remove features
        over time.
      </p>

      <h2>2. Accounts &amp; eligibility</h2>
      <ul>
        <li>You must provide accurate information and keep your login credentials secure.</li>
        <li>You are responsible for all activity under your account and that of users you invite.</li>
        <li>You must be at least 18 years old and authorised to act for your business.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>copy, reverse-engineer, resell, or create a competing product from the Service;</li>
        <li>upload unlawful content or infringe anyone&apos;s rights;</li>
        <li>attempt to access data belonging to other businesses, or probe, scan or breach security;</li>
        <li>use the Service to send spam or violate any applicable law (including GST/tax law).</li>
      </ul>

      <h2>4. Your data</h2>
      <p>
        You own the business data you enter (stock, customers, invoices, etc.). You grant us a limited
        licence to host and process it solely to provide the Service. We handle your data as described in
        our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        The Service, including its software, design, content and the &quot;GraniteOS&quot; name and logo,
        is owned by us and protected by copyright and trademark law. No rights are granted except the
        limited right to use the Service under these Terms.
      </p>

      <h2>6. Subscriptions &amp; payment</h2>
      <p>
        Paid plans (where offered) are billed in advance for the chosen period. Fees are non-refundable
        except where required by law. We may change pricing on reasonable notice.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        The Service relies on third-party providers (e.g. hosting, database, AI and messaging). Your use
        may also be subject to their terms. We are not responsible for third-party services.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. GraniteOS is a business
        tool and does not constitute tax, legal or accounting advice; you remain responsible for your GST
        filings and statutory compliance.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for indirect or consequential losses,
        loss of profit or data. Our total liability is limited to the fees you paid in the 3 months before
        the claim.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate access for breach of these
        Terms. You may request an export of your data before termination.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of India, and disputes are subject to the exclusive
        jurisdiction of the courts at [your city]. (Please confirm the jurisdiction with your lawyer.)
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms: <a href="mailto:hello@graniteos.in">hello@graniteos.in</a>.
      </p>
    </LegalDoc>
  );
}
