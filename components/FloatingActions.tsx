"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, ArrowUp } from "lucide-react";

/**
 * ปุ่มลอยมุมขวาล่าง: ทักไลน์ (เสมอ) + ขึ้นบนสุด (โผล่เมื่อเลื่อนลง)
 * ใช้ rAF throttle กับ scroll เพื่อไม่ให้ jank
 */
export default function FloatingActions() {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShowTop(window.scrollY > 480);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ไม่แสดงในหน้า admin (มี layout ของตัวเอง)
  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-[76px] right-4 z-[90] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="กลับขึ้นบนสุด"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border-default bg-white text-text-body shadow-card transition-transform hover:-translate-y-0.5 hover:text-text-heading"
        >
          <ArrowUp size={20} />
        </button>
      )}
      <a
        href="https://lin.ee/rewiz9b"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="ทักไลน์สอบถามแอดมิน"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#06C755] text-white shadow-[0_8px_22px_rgba(6,199,85,0.45)] transition-transform hover:-translate-y-0.5"
      >
        <MessageCircle size={26} />
      </a>
    </div>
  );
}
