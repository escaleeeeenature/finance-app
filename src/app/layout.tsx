import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance App",
  description: "Gestion financière personnelle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full bg-slate-50 antialiased`}>
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
