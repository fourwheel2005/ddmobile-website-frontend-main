"use client";
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShoppingCart, User, LogOut, FileText, LayoutDashboard,
  Home, Smartphone, CreditCard, Phone, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  email: string;
  role: string;
  name?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const checkAuthStatus = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUserData(JSON.parse(storedUser));
      } else {
        setUserData(null);
      }
    };

    checkAuthStatus();
    window.addEventListener('storage', checkAuthStatus);

    return () => {
      window.removeEventListener('storage', checkAuthStatus);
    };
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUserData(null);
    setIsProfileOpen(false);
    toast.success("ออกจากระบบเรียบร้อยแล้ว");
    window.location.href = "/";
  };

  // ซ่อน Navbar ลูกค้าในหน้า Admin (มี sidebar ของตัวเอง)
  if (pathname.startsWith('/admin')) {
    return null;
  }

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
      {/* ===================== TOP BAR ===================== */}
      <nav className="sticky top-0 z-[100] flex h-14 items-center justify-between border-b border-border-default bg-black px-4 md:h-16 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/images/logo.png"
            alt="DDMOBILE Logo"
            width={44}
            height={44}
            className="h-8 w-auto object-contain md:h-10"
          />
          <span className="logo-dd">
            DD<span className="text-white">MOBILE</span>
          </span>
        </Link>

        {/* Desktop center links */}
        <div className="desktop-nav hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Account zone */}
        <div className="flex items-center gap-3">
          {userData?.role === "ROLE_ADMIN" && (
            <Link href="/admin" className="btn-ghost hidden md:inline-flex">
              <LayoutDashboard size={16} className="text-yellow" /> หลังบ้าน
            </Link>
          )}

          <button aria-label="ตะกร้าสินค้า" className="p-2 text-text-muted transition-colors hover:text-yellow">
            <ShoppingCart size={20} />
          </button>

          {userData ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="เมนูบัญชีผู้ใช้"
                className="flex items-center gap-2 border border-border-default px-3 py-2 text-sm text-text-body transition-colors hover:border-yellow"
              >
                <span className="flex h-6 w-6 items-center justify-center bg-yellow font-display text-xs uppercase text-black">
                  {userData.name ? userData.name.charAt(0) : (userData.email ? userData.email.charAt(0) : "U")}
                </span>
                <span className="hidden max-w-[100px] truncate font-display uppercase tracking-wider sm:inline">
                  {userData.name || userData.email}
                </span>
                <ChevronDown size={16} className={`transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-60 border border-border-strong bg-bg-elevated py-2 shadow-[var(--glow-yellow)]"
                  >
                    <div className="border-b border-border-default px-4 py-3">
                      <p className="font-display text-xs uppercase tracking-widest text-text-muted">เข้าสู่ระบบในชื่อ</p>
                      <p className="truncate text-sm font-semibold text-white">{userData.name || "ลูกค้าทั่วไป"}</p>
                      <p className="truncate text-xs text-text-muted">{userData.email}</p>
                    </div>
                    {userData.role === "ROLE_ADMIN" && (
                      <Link href="/admin" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-text-body transition-colors hover:bg-bg-tinted hover:text-yellow md:hidden">
                        <LayoutDashboard size={16} className="text-yellow" /> หลังบ้าน
                      </Link>
                    )}
                    <Link href="/history" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-text-body transition-colors hover:bg-bg-tinted hover:text-yellow">
                      <FileText size={16} /> ประวัติการผ่อน
                    </Link>
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-border-default px-4 py-3 text-left text-sm font-semibold text-error-text transition-colors hover:bg-error-bg">
                      <LogOut size={16} /> ออกจากระบบ
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/login" aria-label="เข้าสู่ระบบ" className="btn-primary px-3 sm:px-7">
              <User size={16} /> <span className="hidden sm:inline">เข้าสู่ระบบ</span>
            </Link>
          )}
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
              className={`flex h-full flex-1 flex-col items-center justify-center gap-1 font-display text-[10px] uppercase tracking-wider transition-colors ${
                active ? 'bg-yellow text-black' : 'text-text-muted'
              }`}
            >
              <Icon size={20} />
              {link.name}
            </Link>
          );
        })}
      </div>
    </>
  );
}
