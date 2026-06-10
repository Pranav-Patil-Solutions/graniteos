import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Manrope, Fraunces } from "next/font/google";
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
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0b0e11",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // License gate — the app does not run without a valid, signed licence.
  const host = (await headers()).get("host") ?? undefined;
  const license = verifyLicense(host);

  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${fraunces.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased">
        {license.valid ? children : <LicenseGate status={license} />}
      </body>
    </html>
  );
}
