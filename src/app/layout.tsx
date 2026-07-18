import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cité Telico - Portail Immobilier",
  description: "Portail public et système de gestion professionnelle Cité Telico.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
