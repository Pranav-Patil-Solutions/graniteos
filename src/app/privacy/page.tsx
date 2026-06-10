import LegalDoc from "@/components/legal/LegalDoc";

export const metadata = { title: "Privacy Policy · GraniteOS" };

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated="10 June 2026">
      <p>
        This Privacy Policy explains how <b>GraniteOS</b> (operated by <b>Vyaparwerk</b>, &quot;we&quot;, &quot;us&quot;)
        collects, uses, shares and protects personal data when you use the Service. We aim to comply with
        India&apos;s <b>Digital Personal Data Protection Act, 2023 (DPDP Act)</b> and the Information
        Technology Act, 2000 and its SPDI Rules, 2011.
      </p>

      <h2>1. Our two roles (important)</h2>
      <ul>
        <li>
          <b>Your account data</b> — for the data about you and your business account, we act as the
          <b> Data Fiduciary</b> and are responsible for it under this policy.
        </li>
        <li>
          <b>Your customers&apos; &amp; suppliers&apos; data</b> — for the personal data you enter about your own
          customers and suppliers (names, phone numbers, addresses, GSTINs, balances), <b>you</b> are the
          Data Fiduciary and we act only as your <b>Data Processor</b>, processing it on your documented
          instructions. <b>You are responsible for obtaining the necessary consent</b> from those individuals
          (including before sending them WhatsApp updates). We can provide a Data Processing Agreement on request.
        </li>
      </ul>

      <h2>2. Information we collect</h2>
      <ul>
        <li><b>Account data</b> — name, email and/or phone number, company name, role.</li>
        <li>
          <b>Business data you enter</b> — stock (blocks, slabs, photos), customers and suppliers, quotations,
          orders, invoices, payments and fabrication records. This includes <b>sensitive financial information</b>
          (GSTINs, credit/udhaar balances, invoice records), which we treat with corresponding care.
        </li>
        <li><b>Technical data</b> — basic logs needed to operate and secure the Service.</li>
      </ul>

      <h2>3. Lawful basis &amp; how we use it</h2>
      <p>We process personal data on the basis of your <b>consent</b> and for the <b>legitimate uses</b> permitted
        by the DPDP Act, strictly for these purposes:</p>
      <ul>
        <li>to provide, maintain, secure and improve the Service and authenticate you;</li>
        <li>to generate documents (GST invoices, quotes) and AI marketing content you ask for;</li>
        <li>to send messages on your behalf to recipients you select (see §4);</li>
        <li>to communicate with you about the Service and meet legal/tax obligations.</li>
      </ul>
      <p>We use your data only for the purposes notified here (purpose limitation). <b>We do not sell your
        personal or business data.</b></p>

      <h2>4. Marketing &amp; WhatsApp messaging</h2>
      <p>
        Some features (e.g. <b>Stock Alert</b> and the <b>Marketing Helper</b>) let you send WhatsApp messages to
        your customers. Depending on the feature, messages are opened on your own device, or sent through a
        WhatsApp Business API provider on your behalf. <b>You must only message recipients who have opted in</b>,
        and you must honour opt-out requests; we provide a per-customer opt-out control. WhatsApp/Meta and the
        messaging provider receive the recipient phone number and message to deliver it.
      </p>

      <h2>5. Sub-processors we use</h2>
      <ul>
        <li><b>Supabase</b> — database, authentication and file (slab photo) storage.</li>
        <li><b>Vercel</b> — application hosting.</li>
        <li><b>Groq</b> and <b>Google (Gemini)</b> — AI text/image generation, only for content you request;
          inputs are sent to generate that output.</li>
        <li><b>WhatsApp / Meta</b> and any messaging (BSP) provider — to deliver messages you send (§4).</li>
        <li><b>UPI</b> apps — opened on your device to collect payment.</li>
      </ul>
      <p>We maintain this list and will update it for material changes.</p>

      <h2>6. Where your data is stored &amp; cross-border transfer</h2>
      <p>
        Data is stored with our infrastructure providers on encrypted servers. Our database and storage are
        currently hosted in the <b>Supabase EU (Frankfurt) region</b>, and some sub-processors (e.g. Vercel,
        Groq, Google) operate outside India. By using the Service you acknowledge your data may be
        <b> transferred to and processed outside India</b>, subject to applicable law. Each company&apos;s data is
        logically isolated so one business cannot access another&apos;s.
      </p>

      <h2>7. Security</h2>
      <p>
        We use encryption in transit (HTTPS), database row-level security to isolate each business&apos;s data,
        server-only handling of administrative keys, and other reasonable security practices. No system is 100%
        secure, but we take reasonable measures to protect your data.
      </p>

      <h2>8. Data-breach notification</h2>
      <p>
        In the event of a personal-data breach, we will take prompt remedial action and notify the affected
        businesses and the Data Protection Board of India as required by the DPDP Act.
      </p>

      <h2>9. Your rights</h2>
      <p>Subject to applicable law, you may:</p>
      <ul>
        <li>access and correct your data (in-app or by request);</li>
        <li>request an export or <b>erasure</b> of your data;</li>
        <li><b>withdraw consent</b> at any time — as easily as it was given — and close your account;</li>
        <li><b>nominate</b> another individual to exercise your rights in case of death or incapacity;</li>
        <li>raise a grievance with our Grievance Officer (§10), and escalate to the <b>Data Protection Board of
          India</b> if unresolved.</li>
      </ul>

      <h2>10. Grievance Officer</h2>
      <p>
        For any privacy question, data request or complaint, contact our Grievance Officer:
        <br />
        <b>[Grievance Officer name]</b>, Vyaparwerk —{" "}
        <a href="mailto:privacy@graniteos.in">privacy@graniteos.in</a>. We aim to acknowledge within 72 hours
        and resolve within 30 days.
      </p>

      <h2>11. Data retention</h2>
      <p>
        We keep your data while your account is active. After closure we delete or anonymise personal data
        within a reasonable period, except records we must retain for <b>legal, tax and GST purposes</b>
        (generally up to <b>8 years</b>), after which they are deleted.
      </p>

      <h2>12. Children</h2>
      <p>The Service is for businesses and not directed to anyone under 18. We do not knowingly process the data
        of children, and you must not enter a child&apos;s personal data.</p>

      <h2>13. Changes</h2>
      <p>We may update this policy and will revise the &quot;last updated&quot; date; significant changes are
        communicated within the app.</p>

      <h2>14. Contact</h2>
      <p>
        Vyaparwerk — <a href="mailto:hello@graniteos.in">hello@graniteos.in</a>. Operating-entity details and
        registered address are available on request.
      </p>
    </LegalDoc>
  );
}
