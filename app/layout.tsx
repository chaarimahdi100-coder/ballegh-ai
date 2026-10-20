import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import { DemoProvider } from "@/lib/demo/DemoStore";
import { DemoBanner } from "@/components/common/DemoBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ballegh AI — Plateforme Civique Intelligente | بلّغ تونس",
  description:
    "Signalement urbain d'infrastructure à Tunis assisté par l'IA et validé par les agents municipaux (Nids-de-poule, Éclairage public, Inondations).",
  icons: {
    icon: "/brand/ballegh-icon.svg",
    apple: "/brand/ballegh-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" dir="ltr" className={`${inter.variable} ${cairo.variable}`}>
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 selection:bg-brand-teal-500 selection:text-white dark:bg-slate-950 dark:text-slate-50">
        <I18nProvider>
          <DemoProvider>
            <div className="flex min-h-screen flex-col">
              <DemoBanner />
              <div className="flex-1">{children}</div>
            </div>
          </DemoProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
