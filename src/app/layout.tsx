import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Manrope, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { verifyLicense } from "@/lib/license";
import LicenseGate from "@/components/license/LicenseGate";

// Body / UI face
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-manrope" });
// Display / title face (screen titles, big money numbers, the "G" monogram)
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "GraniteOS",
  description: "The operating system for granite & marble businesses",
  manifest: "/manifest.json",
  // iOS PWA support
  appleWebApp: {
    capable: true,
    title: "GraniteOS",
    statusBarStyle: "black-translucent",
  },
  // Apple touch icon (used when the user taps "Add to Home Screen" on iOS)
  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e11",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Licensing is fully wired but ENFORCED ONLY when LICENSE_ENFORCE=1.
  // Flip that env on (with a valid GRANITEOS_LICENSE) to lock the app later.
  let gate: React.ReactNode = null;
  if (process.env.LICENSE_ENFORCE === "1") {
    const host = (await headers()).get("host") ?? undefined;
    const license = verifyLicense(host);
    if (!license.valid) gate = <LicenseGate status={license} />;
  }

  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${fraunces.variable}`}>
      <head>
        {/* Apply the saved theme before paint (no flash). Dark is the default. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('gos-theme')==='light')document.documentElement.classList.add('light')}catch(e){}",
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        {gate ?? children}
        <Analytics />
      </body>
    </html>
  );
}
