import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, Kanit, IBM_Plex_Sans_Thai } from "next/font/google";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast"; // ✅ 1. นำเข้า Toaster ที่นี่
import "./globals.css";

// Latin display (โลโก้/อังกฤษ/ตัวเลข)
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Latin mono (body อังกฤษ/ตัวเลข)
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

// Thai display (fallback per-glyph สำหรับพาดหัวภาษาไทย)
const kanit = Kanit({
  variable: "--font-kanit",
  weight: ["500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
});

// Thai body (fallback per-glyph สำหรับเนื้อหาภาษาไทย)
const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DD Mobile - ผ่อนไอโฟนง่าย ได้เครื่องไว", 
  description: "ผ่อนไอโฟน ไอแพด ใช้เพียงบัตรประชาชนใบเดียว อนุมัติไวภายใน 1 วัน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${bebasNeue.variable} ${plexMono.variable} ${kanit.variable} ${plexThai.variable}`}>
      {/* พื้นหลัง/ฟอนต์หลักกำหนดใน globals.css (@layer base body) */}
      <body className="antialiased">
        <Navbar />
        <main className="pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>

        {/* ✅ 2. วาง Toaster ไว้ล่างสุด และปรับแต่งสีให้พรีเมียมเข้ากับธีม ดำ-เหลือง */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#141414',
              color: '#e0e0e0',
              borderLeft: '3px solid #ffd600',
              borderRadius: '0',
              padding: '14px 20px',
              fontFamily: 'var(--font-plex-mono), monospace',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: {
                primary: '#ffd600',
                secondary: '#000',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}