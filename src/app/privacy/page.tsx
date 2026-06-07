import LegalDoc from "@/components/legal/LegalDoc";

export const metadata = { title: "Privacy Policy · GraniteOS" };

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated="7 June 2026">
      <p>
        This Privacy Policy explains how GraniteOS (operated by Vyaparwerk) collects, uses and protects
        your information when you use the Service.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <b>Account data</b> — name, email and/or phone number, company name, role.
        </li>
        <li>
          <b>Business data you enter</b> — stock (blocks, slabs, photos), customers and suppliers,
          quotations, orders, invoices, payments and fabrication records.
        </li>
        <li>
          <b>Technical data</b> — basic logs needed to operate and secure the Service.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>to provide, maintain and improve the Service;</li>
        <li>to authenticate you and keep your account secure;</li>
        <li>to generate marketing content via AI when you choose to;</li>
        <li>to communicate with you about the Service.</li>
      </ul>
      <p>We do not sell your personal or business data.</p>

      <h2>3. Where your data is stored</h2>
      <p>
        Data is stored with our infrastructure providers (Supabase for the database and file storage, and
        Vercel for hosting) on encrypted servers, hosted in the EU/India region. Each company&apos;s data is
        isolated so that one business cannot access another&apos;s.
      </p>

      <h2>4. Third parties we use</h2>
      <ul>
        <li>
          <b>Supabase</b> — database, authentication and file (slab photo) storage.
        </li>
        <li>
          <b>Vercel</b> — application hosting.
        </li>
        <li>
          <b>Groq</b> — AI text generation, only for the marketing content you ask it to write.
        </li>
        <li>
          <b>WhatsApp / UPI</b> — opened on your device when you choose to share or collect payment;
          we do not transmit your data to them on your behalf.
        </li>
      </ul>

      <h2>5. Security</h2>
      <p>
        We use encryption in transit (HTTPS), database row-level security to isolate each business&apos;s
        data, and restrict access to administrative keys to server-side systems only. No system is 100%
        secure, but we take reasonable measures to protect your data.
      </p>

      <h2>6. Your rights</h2>
      <ul>
        <li>access and update your data within the app;</li>
        <li>request an export or deletion of your data by contacting us;</li>
        <li>withdraw consent or close your account at any time.</li>
      </ul>

      <h2>7. Data retention</h2>
      <p>
        We keep your data for as long as your account is active, and for a reasonable period afterwards as
        required for legal, tax or accounting purposes.
      </p>

      <h2>8. Children</h2>
      <p>The Service is for businesses and not directed to anyone under 18.</p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy and will revise the &quot;last updated&quot; date. Significant changes
        will be communicated within the app.
      </p>

      <h2>10. Contact</h2>
      <p>
        Privacy questions or data requests: <a href="mailto:hello@graniteos.in">hello@graniteos.in</a>.
      </p>
    </LegalDoc>
  );
}
