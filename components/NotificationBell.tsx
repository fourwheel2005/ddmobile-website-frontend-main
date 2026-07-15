"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

interface Noti {
  id: number;
  title: string;
  message: string;
  orderId: number | null;
  read: boolean;
  createdAt: string | null;
}

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "เมื่อสักครู่";
  if (sec < 3600) return `${Math.floor(sec / 60)} นาทีที่แล้ว`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ชม.ที่แล้ว`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} วันที่แล้ว`;
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" });
};

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Noti[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const r = await api.get("/notifications/unread-count");
      setUnread(r.data?.count ?? 0);
    } catch { /* ไม่ล็อกอิน/ผิดพลาด → เงียบ */ }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      const r = await api.get("/notifications");
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch { /* เงียบ */ }
  }, []);

  // poll จำนวนยังไม่อ่าน + เช็คตอนกลับมาโฟกัสหน้าต่าง
  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 45000);
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [fetchCount]);

  // ปิดเมื่อคลิกนอกกล่อง
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  };

  const openItem = (it: Noti) => {
    setOpen(false);
    if (!it.read) {
      setItems((p) => p.map((x) => (x.id === it.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.post(`/notifications/${it.id}/read`).catch(() => {});
    }
    if (it.orderId) router.push(`/orders/${it.orderId}`);
  };

  const readAll = () => {
    setItems((p) => p.map((x) => ({ ...x, read: true })));
    setUnread(0);
    api.post("/notifications/read-all").catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-label={unread > 0 ? `การแจ้งเตือน (${unread} รายการใหม่)` : "การแจ้งเตือน"} aria-haspopup="menu" aria-expanded={open} className="relative rounded-full p-2 text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-heading">
        <Bell size={20} />
        {unread > 0 && (
          <span key={unread} className="dd-pop absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-yellow px-1 text-[11px] font-bold text-[#1a1a1a]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border-default bg-white shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
              <span className="font-bold text-text-heading">การแจ้งเตือน</span>
              {items.some((i) => !i.read) && (
                <button onClick={readAll} className="flex items-center gap-1 text-xs font-medium text-yellow-hover hover:underline">
                  <CheckCheck size={13} /> อ่านทั้งหมด
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-text-muted">ยังไม่มีการแจ้งเตือน</p>
              ) : (
                items.map((it) => (
                  <button key={it.id} onClick={() => openItem(it)} className={`flex w-full gap-3 border-b border-border-subtle px-4 py-3 text-left transition-colors last:border-0 hover:bg-bg-subtle ${it.read ? "" : "bg-yellow/10"}`}>
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow/20 text-yellow-hover">
                      <Package size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${it.read ? "text-text-body" : "font-semibold text-text-heading"}`}>{it.title}</p>
                      <p className="line-clamp-2 text-xs text-text-muted">{it.message}</p>
                      <p className="mt-0.5 text-[11px] text-text-disabled">{timeAgo(it.createdAt)}</p>
                    </div>
                    {!it.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-yellow" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
