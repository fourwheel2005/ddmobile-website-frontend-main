import type { Metadata } from "next";
import { Anuphan, IBM_Plex_Sans_Thai } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingActions from "@/components/FloatingActions";
import { Toaster } from "react-hot-toast"; // ✅ 1. นำเข้า Toaster ที่นี่
import { CartProvider } from "@/context/CartContext";
import "./globals.css";

// Display (หัวข้อ/ตัวเลข) — Anuphan มี glyph ไทย+ละตินครบ (Space Grotesk เดิมไม่มีไทย → หัวข้อฟอนต์ผสม)
const anuphan = Anuphan({
  variable: "--font-anuphan",
  weight: ["500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
});

// Body + Thai — IBM Plex Sans Thai (รองรับไทยทั้งหัวข้อ/เนื้อหา) เหมือนหน้า Stock UI
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
    <html lang="th" className={`${anuphan.variable} ${plexThai.variable}`}>
      {/* พื้นหลัง/ฟอนต์หลักกำหนดใน globals.css (@layer base body) */}
      <body className="antialiased">
        <CartProvider>
          <Navbar />
          <main className="pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
          <Footer />
          <FloatingActions />
        </CartProvider>

        {/* Toaster — โทนขาวสะอาดเข้ากับธีมใหม่ */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '14px 18px',
              fontFamily: 'var(--font-plex-thai), system-ui, sans-serif',
              fontSize: '0.9rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            },
            success: {
              iconTheme: {
                primary: '#16a34a',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#e4002b',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}