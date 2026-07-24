"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Facebook, Instagram, MessageCircle, Phone } from "lucide-react";
import { LINE_URL, TEL, TEL_HREF, FACEBOOK_URL, TIKTOK_URL, INSTAGRAM_URL } from "@/lib/contact";
import { useCookieConsent } from "@/context/CookieConsentContext";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.5 3a5.6 5.6 0 0 0 4.5 4.9v3a8.6 8.6 0 0 1-4.5-1.3v6.1a6.3 6.3 0 1 1-6.3-6.3c.3 0 .6 0 .9.1v3.1a3.3 3.3 0 1 0 2.3 3.1V3h3.1Z" />
    </svg>
  );
}

/** Footer กลาง — โชว์ทุกหน้า (ยกเว้นหลังบ้าน /admin ที่เป็น app shell เต็มจอ) */
export default function Footer() {
  const pathname = usePathname();
  const { openPreferences } = useCookieConsent();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-border-default bg-bg-subtle pt-12 pb-10">
      <div className="container-dd grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" className="mb-4 inline-block">
            <Image src="/images/logo.png" alt="DDMOBILE Logo" width={120} height={48} className="h-11 w-auto object-contain" />
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-text-muted">
            ผู้นำด้านบริการผ่อนโทรศัพท์มือถือและสินค้าไอที อนุมัติไว เงื่อนไขง่าย เข้าถึงได้ทุกคน
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-text-heading">เมนูทางลัด</h4>
          <ul className="space-y-2 text-sm text-text-muted">
            <li><Link href="/" className="hover:text-yellow-hover">หน้าหลัก</Link></li>
            <li><Link href="/products" className="hover:text-yellow-hover">สินค้าทั้งหมด</Link></li>
            <li><Link href="/installments" className="hover:text-yellow-hover">ขั้นตอนการผ่อน</Link></li>
            <li><Link href="/contact" className="hover:text-yellow-hover">ติดต่อเรา</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-text-heading">ติดตามเรา</h4>
          <div className="flex flex-col gap-3">
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border-default bg-white p-3 transition-colors hover:border-yellow">
              <Facebook size={20} className="text-[#1877F2]" />
              <span className="text-sm text-text-body">ไอโฟนผ่อนง่ายสำรอง</span>
            </a>
            <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border-default bg-white p-3 transition-colors hover:border-yellow">
              <TikTokIcon className="h-5 w-5 text-text-heading" />
              <span className="text-sm text-text-body">ddmobile_</span>
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border-default bg-white p-3 transition-colors hover:border-yellow">
              <Instagram size={20} className="text-[#E4405F]" />
              <span className="text-sm text-text-body">ddmobileplus</span>
            </a>
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border-default bg-white p-3 transition-colors hover:border-yellow">
              <MessageCircle size={20} className="text-line" />
              <span className="text-sm text-text-body">LINE: ไอโฟนผ่อนง่าย</span>
            </a>
            <a href={TEL_HREF}
              className="flex items-center gap-3 rounded-xl border border-border-default bg-white p-3 transition-colors hover:border-yellow">
              <Phone size={20} className="text-yellow-hover" />
              <span className="text-sm text-text-body">{TEL}</span>
            </a>
          </div>
        </div>
      </div>
      <div className="container-dd mt-10 flex flex-col items-center justify-center gap-2 border-t border-border-default pt-6 text-center text-xs text-text-muted sm:flex-row sm:gap-3">
        <span>© {new Date().getFullYear()} DDMOBILE. All rights reserved.</span>
        <span className="hidden sm:inline" aria-hidden="true">·</span>
        <Link href="/privacy" className="underline-offset-2 transition-colors hover:text-text-heading hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
        <span className="hidden sm:inline" aria-hidden="true">·</span>
        <button
          type="button"
          onClick={openPreferences}
          className="underline-offset-2 transition-colors hover:text-text-heading hover:underline"
        >
          จัดการคุกกี้
        </button>
      </div>
    </footer>
  );
}
