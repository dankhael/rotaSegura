import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Rota Segura",
  description: "App de segurança em desastres — rotas e pontos de apoio durante emergências.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body
        data-density="comfortable"
        data-contrast="normal"
        style={{
          background: "var(--bg)",
          color: "var(--ink)",
          fontFamily: "var(--font-sans), system-ui, sans-serif",
        }}
        className="flex min-h-full flex-col"
      >
        {children}
      </body>
    </html>
  );
}
