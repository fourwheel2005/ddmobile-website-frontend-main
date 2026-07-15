"use client";
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShoppingCart, User, LogOut, FileText, LayoutDashboard,
  Home, Smartphone, CreditCard, Phone, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useCart } from '@/context/CartContext';
import NotificationBell from '@/components/NotificationBell';
import WelcomeWheelGate from '@/components/WelcomeWheelGate';

interface UserData {
  email: string;
  role: string;
  name?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const { count } = useCart();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const checkAuthStatus = () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) { setUserData(null); return; }
      try {
        setUserData(JSON.parse(storedUser));
      } catch {
        // ข้อมูลใน localStorage เพี้ยน → ล้างทิ้ง กันทั้ง Navbar (และทุกหน้า) พังจาก parse error
        localStorage.removeItem('user');
        setUserData(null);
      }
    };
    checkAuthStatus();
    window.addEventListener('storage', checkAuthStatus);
    return () => window.removeEventListener('storage', checkAuthStatus);
  }, [pathname]);

  const handleLogout = () => {
    api.post('/auth/logout').catch(() => { /* เคลียร์ฝั่ง server (cookie) — ล้มก็ไม่เป็นไร */ });
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUserData(null);
    setIsProfileOpen(false);
    toast.success("ออกจากระบบเรียบร้อยแล้ว");
    window.location.href = "/";
  };

  if (pathname.startsWith('/admin')) return null;

  const navLinks = [
    { name: 'หน้าหลัก', href: '/', icon: Home },
    { name: 'สินค้าทั้งหมด', href: '/products', icon: Smartphone },
    { name: 'ผ่อนสินค้า', href: '/installments', icon: CreditCard },
    { name: 'ติดต่อเรา', href: '/contact', icon: Phone },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* วงล้อต้อนรับสมาชิกใหม่ (เด้งอัตโนมัติเมื่อยังไม่เคยหมุน) */}
      <WelcomeWheelGate />

      {/* ===================== TOP BAR ===================== */}
      <nav className="sticky top-0 z-[100] border-b border-border-default bg-white/95 backdrop-blur-sm">
        <div className="container-dd flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="DDMOBILE Logo" width={40} height={40} className="h-9 w-auto object-contain" />
            <span className="logo-dd">DD<span className="text-yellow-hover">MOBILE</span></span>
          </Link>

          {/* Desktop center links */}
          <div className="desktop-nav hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} className={`nav-link ${isActive(link.href) ? 'active' : ''}`}>
                {link.name}
              </Link>
            ))}
          </div>

          {/* Account zone */}
          <div className="flex items-center gap-2 sm:gap-3">
            {userData?.role === "ROLE_ADMIN" && (
              <Link href="/admin" className="btn-ghost hidden md:inline-flex">
                <LayoutDashboard size={16} className="text-yellow-hover" /> หลังบ้าน
              </Link>
            )}

            {userData && <NotificationBell />}

            <Link href="/cart" aria-label="ตะกร้าสินค้า" className="relative rounded-full p-2 text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-heading">
              <ShoppingCart size={20} />
              {count > 0 && (
                <span key={count} className="dd-pop absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-yellow px-1 text-[11px] font-bold text-[#1a1a1a]">{count}</span>
              )}
            </Link>

            {userData ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  aria-label="เมนูบัญชีผู้ใช้"
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                  className="flex items-center gap-2 rounded-full border border-border-default py-1.5 pl-1.5 pr-3 text-sm text-text-body transition-colors hover:border-yellow"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow text-xs font-bold uppercase text-[#1a1a1a]">
                    {userData.name ? userData.name.charAt(0) : (userData.email ? userData.email.charAt(0) : "U")}
                  </span>
                  <span className="hidden max-w-[100px] truncate font-medium sm:inline">{userData.name || userData.email}</span>
                  <ChevronDown size={16} className={`transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-border-default bg-white py-2 shadow-[var(--shadow-hover)]"
                    >
                      <div className="border-b border-border-subtle px-4 py-3">
                        <p className="text-xs text-text-muted">เข้าสู่ระบบในชื่อ</p>
                        <p className="truncate text-sm font-semibold text-text-heading">{userData.name || "ลูกค้าทั่วไป"}</p>
                        <p className="truncate text-xs text-text-muted">{userData.email}</p>
                      </div>
                      {userData.role === "ROLE_ADMIN" && (
                        <Link href="/admin" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-body transition-colors hover:bg-bg-subtle md:hidden">
                          <LayoutDashboard size={16} className="text-yellow-hover" /> หลังบ้าน
                        </Link>
                      )}
                      <Link href="/orders" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-body transition-colors hover:bg-bg-subtle">
                        <FileText size={16} /> คำสั่งซื้อของฉัน
                      </Link>
                      <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-error-text transition-colors hover:bg-error-bg">
                        <LogOut size={16} /> ออกจากระบบ
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login" aria-label="เข้าสู่ระบบ" className="btn-primary px-3 sm:px-6">
                <User size={16} /> <span className="hidden sm:inline">เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ===================== MOBILE BOTTOM NAV ===================== */}
      <div className="mobile-nav items-center justify-around">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              aria-label={link.name}
              className={`flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? 'text-yellow-hover' : 'text-text-muted'
              }`}
            >
              <Icon size={22} className={active ? 'text-yellow-hover' : ''} />
              {link.name}
            </Link>
          );
        })}
      </div>
    </>
  );
}
