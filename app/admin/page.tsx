"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { getApiError, getApiStatus } from "@/lib/errorMessage";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Smartphone, ClipboardList, Users,
  LogOut, Clock, CheckCircle2, XCircle, Loader2,
  X, AlertTriangle, Warehouse, Menu, Search,
  ShoppingBag, Check, Eye, Truck, Store, CreditCard, Receipt, UserCog, TicketPercent, Banknote, TrendingUp, Zap, Star, Target
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import StockInventory from "@/components/StockInventory";
import NotificationBell from "@/components/NotificationBell";
import SalesLogs from "@/components/SalesLogs";
import InstallmentManager from "@/components/InstallmentManager";
import EmployeeManager from "@/components/EmployeeManager";
import CouponAdmin from "@/components/CouponAdmin";
import PromotionManager from "@/components/PromotionManager";
import ReviewAdmin from "@/components/ReviewAdmin";
import IntentStats from "@/components/IntentStats";
import StatCard from "@/components/ui/StatCard";
import SalesChart, { type DailySales } from "@/components/ui/SalesChart";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { TableSkeleton, StatCardSkeleton } from "@/components/Skeletons";
import { useEscapeKey } from "@/lib/useEscapeKey";

interface InstallmentApp {
  id: number;
  customerName: string;
  customerTel: string;
  productName: string;
  applicationDate: string;
  status: string;
}

interface Customer {
  id: number;
  email: string;
  role: string;
}

interface WebOrderItem { productName: string; condition: string; quantity: number; lineTotal: number; }
interface WebOrder {
  id: number; status: string; paymentMethod: string; customerName: string; customerTel: string;
  shippingAddress: string | null; note: string | null; total: number; createdAt: string;
  items: WebOrderItem[]; slipFileId: string | null; slipVerified: boolean | null; slipAmount: number | null;
  installmentMonths: number | null; downPayment: number | null; monthlyPayment: number | null;
  stockOrderId: string | null;
  shippingPartner: string | null; trackingNumber: string | null;
  confirmedAt: string | null; preparingAt: string | null; shippedAt: string | null;
  deliveredAt: string | null; completedAt: string | null;
}

interface StockSummary { totalAvailable: number; newAvailable: number; secondHandAvailable: number; }
interface SalesBillLite { grandTotal: number | null; status: string | null; createdAt: string | null; }
interface StockLowItem { id: string; sku: string; productName: string; currentQty: number; thresholdQty: number; }
function toArr<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === "object" && Array.isArray((d as { content?: unknown }).content)) return (d as { content: T[] }).content;
  return [];
}

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState("ภาพรวมระบบ");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [applications, setApplications] = useState<InstallmentApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [webOrders, setWebOrders] = useState<WebOrder[]>([]);
  const [slipModal, setSlipModal] = useState<{ url: string } | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [shipModal, setShipModal] = useState<{ id: number } | null>(null);
  const [shipPartner, setShipPartner] = useState("");
  const [shipTracking, setShipTracking] = useState("");
  const [orderQ, setOrderQ] = useState("");             // ค้นหาออเดอร์ (ชื่อ/เบอร์/สินค้า/#id)
  const [orderStatus, setOrderStatus] = useState("");   // กรองสถานะออเดอร์
  const [orderLimit, setOrderLimit] = useState(20);     // โหลดเพิ่มทีละ 20 (เลิกโชว์ทั้งก้อน)
  const [custQ, setCustQ] = useState("");               // ค้นหาลูกค้า

  // Stock real-time (ผ่าน DD BFF — ไม่ต้อง login stock แยก)
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [stockLow, setStockLow] = useState<StockLowItem[]>([]);
  const [salesBills, setSalesBills] = useState<SalesBillLite[]>([]);   // บิลขายจริงจาก Stock → KPI + กราฟ

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        window.location.href = "/login";
        return false;
      }

      let user: { role?: string };
      try {
        user = JSON.parse(userStr);
      } catch {
        // ข้อมูล user เพี้ยน → เคลียร์แล้วให้ล็อกอินใหม่ (กัน parse error ทำหน้าแอดมินขาว)
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return false;
      }
      if (user.role !== "ROLE_ADMIN") {
        toast.error("คุณไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแลระบบ!");
        window.location.href = "/";
        return false;
      }

      setIsAuthorized(true);
      return true;
    };

    const fetchData = async () => {
      try {
        const [, appsRes, customersRes, ordersRes, sumRes, lowRes, salesRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/applications"),
          api.get("/admin/customers"),
          api.get("/admin/orders"),
          api.get("/admin/stock/summary").catch(() => null),   // stock ล่มไม่ทำให้ทั้ง dashboard พัง
          api.get("/admin/stock/low-stock").catch(() => null),
          api.get("/admin/stock/sales").catch(() => null),
        ]);

        setApplications(appsRes.data);
        setCustomers(customersRes.data);
        setWebOrders(ordersRes.data);
        setStockSummary(sumRes?.data ?? null);
        setStockLow(toArr<StockLowItem>(lowRes?.data));
        setSalesBills(toArr<SalesBillLite>(salesRes?.data));
      } catch (error: unknown) {
        console.error("Fetch Data Error:", error);
        if ([401, 403].includes(getApiStatus(error) ?? 0)) {
          toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (checkAuth()) {
      fetchData();
    }
  }, []);

  const handleLogout = () => {
    api.post("/auth/logout").catch(() => { /* เคลียร์ cookie ฝั่ง server */ });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // ===== คำสั่งซื้อจากเว็บ =====
  const confirmWebOrder = async (id: number) => {
    if (!(await confirmDialog({ title: "ยืนยันคำสั่งซื้อนี้?", message: "ระบบจะตัดสต็อกจริงที่คลังทันที" }))) return;
    setBusyOrderId(id);
    try {
      const res = await api.post(`/admin/orders/${id}/confirm`);
      setWebOrders(prev => prev.map(o => o.id === id ? res.data : o));
      toast.success("ยืนยันออเดอร์ + ตัดสต็อกสำเร็จ!");
    } catch (error: unknown) {
      toast.error(getApiError(error, "ยืนยันไม่สำเร็จ (อาจมีสินค้าถูกขายไปแล้ว)"));
    } finally {
      setBusyOrderId(null);
    }
  };

  const rejectWebOrder = async (id: number) => {
    if (!(await confirmDialog({ title: "ปฏิเสธคำสั่งซื้อนี้?", message: "สินค้าที่จองไว้จะถูกปล่อยคืนกลับเข้าคลัง", confirmText: "ปฏิเสธออเดอร์", danger: true }))) return;
    setBusyOrderId(id);
    try {
      const res = await api.post(`/admin/orders/${id}/reject`);
      setWebOrders(prev => prev.map(o => o.id === id ? res.data : o));
      toast.success("ปฏิเสธคำสั่งซื้อแล้ว");
    } catch (error: unknown) {
      toast.error(getApiError(error, "ทำรายการไม่สำเร็จ"));
    } finally {
      setBusyOrderId(null);
    }
  };

  // เลื่อนสถานะจัดส่ง (PREPARING/SHIPPED/DELIVERED/READY_PICKUP/PICKED_UP/COMPLETED)
  const fulfill = async (id: number, status: string, shippingPartner?: string, trackingNumber?: string) => {
    setBusyOrderId(id);
    try {
      const res = await api.post(`/admin/orders/${id}/fulfillment`, { status, shippingPartner, trackingNumber });
      setWebOrders(prev => prev.map(o => o.id === id ? res.data : o));
      toast.success("อัปเดตสถานะแล้ว");
      setShipModal(null); setShipPartner(""); setShipTracking("");
    } catch (error: unknown) {
      toast.error(getApiError(error, "อัปเดตสถานะไม่สำเร็จ"));
    } finally {
      setBusyOrderId(null);
    }
  };

  const viewSlip = async (id: number) => {
    try {
      const res = await api.get(`/admin/orders/${id}/slip`, { responseType: "blob" });
      setSlipModal((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);   // คืน blob เดิมก่อนสร้างใหม่ (กัน memory leak)
        return { url: URL.createObjectURL(res.data) };
      });
    } catch {
      toast.error("ไม่พบสลิปของออเดอร์นี้");
    }
  };
  const closeSlipModal = () => {
    setSlipModal((prev) => { if (prev) URL.revokeObjectURL(prev.url); return null; });
  };

  // คิวงาน: เรียง "ต้องดำเนินการ + เกินกำหนด" ขึ้นก่อน + นับสรุป
  // หมายเหตุ: useMemo ต้องอยู่ "ก่อน" early return (!isAuthorized) เสมอ — กันลำดับ hooks เปลี่ยน (Rules of Hooks)
  const orderedWeb = useMemo(() => {
    return [...webOrders].sort((a, b) => {
      const ra = slaInfo(a)?.ratio ?? -1;
      const rb = slaInfo(b)?.ratio ?? -1;
      return rb - ra;
    });
  }, [webOrders]);
  const slaCounts = useMemo(() => {
    let action = 0, overdue = 0;
    webOrders.forEach(o => { const s = slaInfo(o); if (s) { action++; if (s.level === "red") overdue++; } });
    return { action, overdue };
  }, [webOrders]);
  const filteredWeb = useMemo(() => {
    const q = orderQ.trim().toLowerCase();
    return orderedWeb.filter(o => {
      if (orderStatus && o.status !== orderStatus) return false;
      if (!q) return true;
      const hay = `#${o.id} ${o.customerName} ${o.customerTel} ${o.items.map(i => i.productName).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orderedWeb, orderQ, orderStatus]);
  const filteredCustomers = useMemo(() => {
    const q = custQ.trim().toLowerCase();
    return q ? customers.filter(c => c.email.toLowerCase().includes(q)) : customers;
  }, [customers, custQ]);
  // ยอดขายจริงจาก Stock → รายวัน 14 วันล่าสุด (ไม่นับบิลคืนเงิน/ยกเลิก)
  const sales14 = useMemo<DailySales[]>(() => {
    const byDay = new Map<string, { total: number; bills: number }>();
    for (const b of salesBills) {
      const st = (b.status || "").toUpperCase();
      if (st.includes("REFUND") || st.includes("CANCEL")) continue;
      if (!b.createdAt) continue;
      const d = new Date(b.createdAt);
      if (isNaN(d.getTime())) continue;
      const key = d.toLocaleDateString("sv-SE");   // YYYY-MM-DD ตามเวลาท้องถิ่น
      const cur = byDay.get(key) ?? { total: 0, bills: 0 };
      cur.total += b.grandTotal ?? 0;
      cur.bills += 1;
      byDay.set(key, cur);
    }
    const out: DailySales[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("sv-SE");
      const v = byDay.get(key);
      out.push({ date: key, total: v?.total ?? 0, bills: v?.bills ?? 0 });
    }
    return out;
  }, [salesBills]);
  const revToday = sales14[13]?.total ?? 0;
  const rev7 = sales14.slice(7).reduce((a, d) => a + d.total, 0);
  const billsToday = sales14[13]?.bills ?? 0;

  // ปิดโมดัลด้วย Esc (ต้องเรียก hook ก่อน early return เสมอ — Rules of Hooks)
  useEscapeKey(!!slipModal, closeSlipModal);
  useEscapeKey(!!shipModal, () => setShipModal(null));

  if (!isAuthorized) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg-base text-yellow-hover">
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  // ภาพรวมขับเคลื่อนด้วย Stock real-time (จาก /admin/stock/summary) + คำสั่งซื้อรอดำเนินการ
  const pendingOrders = webOrders.filter(o => ["RESERVED", "PENDING_REVIEW", "PENDING_PICKUP"].includes(o.status)).length;

  const statsUI = [
    { title: "พร้อมขายทั้งหมด", value: stockSummary?.totalAvailable ?? 0, unit: "เครื่อง", icon: Warehouse, color: "text-yellow" },
    { title: "เครื่องใหม่ (มือ 1)", value: stockSummary?.newAvailable ?? 0, unit: "เครื่อง", icon: CheckCircle2, color: "text-success-text" },
    { title: "เครื่องมือสอง (มือ 2)", value: stockSummary?.secondHandAvailable ?? 0, unit: "เครื่อง", icon: Smartphone, color: "text-info-text" },
    { title: "คำสั่งซื้อรอดำเนินการ", value: pendingOrders, unit: "ออเดอร์", icon: ShoppingBag, color: "text-error-text" },
  ];

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-bg-base text-text-body">

      {/* --- SIDEBAR (drawer บนมือถือ) --- */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} aria-hidden className="fixed inset-0 z-40 bg-black/40 md:hidden" />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-default bg-bg-surface transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-border-default px-6">
          <Link href="/" className="logo-dd text-2xl">
            DD<span className="text-text-heading">ADMIN</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} aria-label="ปิดเมนู" className="p-1 text-text-muted hover:text-text-heading md:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <p className="section-label mb-4 px-3">เมนูหลัก</p>
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => { setActiveMenu(item.name); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 font-display text-sm font-semibold transition-colors ${
                activeMenu === item.name ? "bg-yellow text-black" : "text-text-muted hover:bg-bg-tinted hover:text-text-heading"
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="space-y-1 border-t border-border-default p-3">
          <Link href="/" className="flex w-full items-center gap-3 rounded-lg px-4 py-3 font-display text-sm font-semibold text-text-body transition-colors hover:bg-bg-tinted hover:text-text-heading">
            <Store size={18} className="text-yellow-hover" /> ดูหน้าร้าน
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 font-display text-sm font-semibold text-error-text transition-colors hover:bg-error-bg">
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* --- MAIN --- */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border-default bg-bg-subtle px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} aria-label="เปิดเมนู" className="-ml-1 p-1 text-text-heading md:hidden">
              <Menu size={24} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg md:text-2xl">{activeMenu}</h1>
              <p className="hidden text-xs text-text-muted sm:block">DD Mobile · ระบบจัดการหลังร้าน</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* กระดิ่งแจ้งเตือนจริง (poll + badge + dropdown) — ตัวเดียวกับหน้าร้าน */}
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="space-y-6">
              <StatCardSkeleton />
              <div className="overflow-hidden rounded-2xl border border-border-default bg-white"><TableSkeleton rows={6} cols={5} /></div>
            </div>
          ) : (
            <>
              {/* ภาพรวมระบบ */}
              {activeMenu === "ภาพรวมระบบ" && (
                <div className="stagger-children">
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statsUI.map((stat, idx) => (
                      <StatCard key={idx} icon={stat.icon} label={stat.title} value={stat.value} unit={stat.unit} iconClass={stat.color} />
                    ))}
                  </div>

                  {/* ยอดขายจริงจาก Stock (เดิม fetch มาแล้วไม่ได้โชว์ที่ไหนเลย) */}
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard icon={Banknote} label="ยอดขายวันนี้" value={revToday} prefix="฿" iconClass="text-success-text" />
                    <StatCard icon={TrendingUp} label="ยอดขาย 7 วันล่าสุด" value={rev7} prefix="฿" iconClass="text-yellow" />
                    <StatCard icon={Receipt} label="บิลวันนี้" value={billsToday} unit="บิล" iconClass="text-info-text" />
                  </div>
                  <div className="mb-6 overflow-hidden rounded-2xl border border-border-default bg-white">
                    <div className="flex items-center justify-between border-b border-border-default p-4">
                      <h2 className="flex items-center gap-2 font-display text-xl"><TrendingUp className="text-yellow" size={20} /> ยอดขาย 14 วันล่าสุด</h2>
                      <button onClick={() => setActiveMenu("บิล & สต็อก (Logs)")} className="btn-ghost">ดูบิลทั้งหมด →</button>
                    </div>
                    <div className="p-4 pt-6">
                      <SalesChart data={sales14} />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
                    <div className="flex items-center justify-between border-b border-border-default bg-bg-surface p-4">
                      <h2 className="flex items-center gap-2 font-display text-xl"><AlertTriangle className="text-yellow" size={20} /> แจ้งเตือนสินค้าใกล้หมด (จาก Stock real-time)</h2>
                      <button onClick={() => setActiveMenu("คลังสินค้า")} className="btn-ghost">ดูคลังทั้งหมด →</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="table-dd">
                        <thead>
                          <tr>
                            <th>SKU</th><th>สินค้า</th><th className="text-center">คงเหลือ</th><th className="text-center">เกณฑ์เตือน</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockLow.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center font-display text-sm text-text-muted"><CheckCircle2 size={15} className="mr-1.5 inline -translate-y-px text-success-text" />สินค้าทุกรุ่นมีสต็อกเพียงพอ</td></tr>
                          ) : (
                            stockLow.map((it) => (
                              <tr key={it.id}>
                                <td className="font-mono text-xs text-text-muted">{it.sku}</td>
                                <td className="font-semibold text-text-heading">{it.productName}</td>
                                <td className="text-center">
                                  <span className={`badge-dd ${it.currentQty === 0 ? "badge-error" : "badge-warning"}`}>{it.currentQty}</span>
                                </td>
                                <td className="text-center text-text-muted">{it.thresholdQty}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* คำขอผ่อนสินค้า */}
              {activeMenu === "คำขอผ่อนสินค้า" && (
                <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
                  <div className="border-b border-border-default bg-bg-surface p-4">
                    <h2 className="font-display text-xl">คำขอผ่อนสินค้าล่าสุด (ยื่นผ่านระบบ)</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-dd">
                      <thead>
                        <tr><th>ลูกค้า</th><th>รุ่นสินค้า</th><th>วันที่ยื่นเรื่อง</th><th>สถานะ</th></tr>
                      </thead>
                      <tbody>
                        {applications.length === 0 ? (
                          <tr><td colSpan={4} className="p-8 text-center font-display text-sm text-text-muted">ยังไม่มีข้อมูลคำขอผ่อนสินค้าผ่านระบบเว็บ</td></tr>
                        ) : (
                          applications.map((app) => (
                            <tr key={app.id}>
                              <td><p className="font-semibold text-text-heading">{app.customerName}</p><p className="text-xs text-text-muted">{app.customerTel}</p></td>
                              <td><span className="badge-dd badge-info">{app.productName}</span></td>
                              <td className="text-text-muted">{app.applicationDate}</td>
                              <td>
                                <span className={`badge-dd ${app.status === "รออนุมัติ" ? "badge-warning" : app.status === "อนุมัติแล้ว" ? "badge-success" : "badge-error"}`}>
                                  {app.status === "รออนุมัติ" ? <Clock size={12} /> : app.status === "อนุมัติแล้ว" ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {app.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* จัดการลูกค้า */}
              {activeMenu === "จัดการลูกค้า" && (
                <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
                  <div className="flex items-center justify-between border-b border-border-default bg-bg-surface p-4">
                    <h2 className="flex items-center gap-2 font-display text-xl"><Users className="text-yellow" size={20} /> รายชื่อลูกค้าทั้งหมด</h2>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                        <input value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="ค้นหาอีเมล..." aria-label="ค้นหาลูกค้า" className="input-dd min-h-0 w-44 py-2 pl-9 text-sm" />
                      </div>
                      <span className="badge-dd badge-warning">{filteredCustomers.length} คน</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-dd">
                      <thead>
                        <tr><th>รหัสลูกค้า</th><th>บัญชี (Email)</th><th>ระดับสิทธิ์</th><th>สถานะบัญชี</th></tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.length === 0 ? (
                          <tr><td colSpan={4} className="p-8 text-center text-text-muted">ไม่พบลูกค้าที่ค้นหา</td></tr>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <tr key={customer.id} className="group">
                              <td className="text-text-muted">CUST-{customer.id.toString().padStart(4, "0")}</td>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-tinted font-display text-base font-bold uppercase text-yellow-text">{customer.email.charAt(0)}</div>
                                  <p className="font-semibold text-text-heading">{customer.email}</p>
                                </div>
                              </td>
                              <td><span className="badge-dd badge-info">ลูกค้าทั่วไป</span></td>
                              <td><span className="badge-dd badge-success"><CheckCircle2 size={12} /> ปกติ (Active)</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* คำสั่งซื้อจากเว็บ */}
              {activeMenu === "คำสั่งซื้อ (เว็บ)" && (
                <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
                  <div className="flex items-center justify-between border-b border-border-default bg-bg-surface p-4">
                    <h2 className="flex items-center gap-2 font-display text-xl"><ShoppingBag className="text-yellow" size={20} /> คำสั่งซื้อจากหน้าเว็บ</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      {slaCounts.action > 0 && <span className="badge-dd badge-info">ต้องดำเนินการ {slaCounts.action}</span>}
                      {slaCounts.overdue > 0 && <span className="badge-dd badge-error"><Clock size={12} /> เกินกำหนด {slaCounts.overdue}</span>}
                      <span className="badge-dd badge-warning">{filteredWeb.length} รายการ</span>
                    </div>
                  </div>
                  {/* toolbar: ค้นหา + กรองสถานะ */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-border-default bg-bg-subtle px-4 py-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                      <input value={orderQ} onChange={(e) => { setOrderQ(e.target.value); setOrderLimit(20); }} placeholder="ค้นหา #id / ชื่อ / เบอร์ / สินค้า..." aria-label="ค้นหาออเดอร์" className="input-dd min-h-0 w-64 py-2 pl-9 text-sm" />
                    </div>
                    <select value={orderStatus} onChange={(e) => { setOrderStatus(e.target.value); setOrderLimit(20); }} aria-label="กรองสถานะ" className="input-dd min-h-0 w-auto cursor-pointer py-2 text-sm">
                      <option value="">ทุกสถานะ</option>
                      {Object.entries(ORDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}
                    </select>
                  </div>
                  <div className="max-h-[65vh] overflow-auto">
                    <table className="table-dd">
                      <thead>
                        <tr><th>ออเดอร์</th><th>ลูกค้า</th><th>สินค้า</th><th className="text-right">ยอด</th><th className="text-center">รับสินค้า</th><th>สถานะ</th><th className="text-right">จัดการ</th></tr>
                      </thead>
                      <tbody>
                        {filteredWeb.length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center text-text-muted">{webOrders.length === 0 ? "ยังไม่มีคำสั่งซื้อจากเว็บ" : "ไม่พบออเดอร์ที่ค้นหา"}</td></tr>
                        ) : (
                          filteredWeb.slice(0, orderLimit).map((o) => {
                            const st = ORDER_LABEL[o.status] || ORDER_LABEL.RESERVED;
                            const active = o.status !== "CONFIRMED" && o.status !== "REJECTED";
                            const sla = slaInfo(o);
                            return (
                              <tr key={o.id}>
                                <td>
                                  <p className="font-semibold text-text-heading">#{o.id}</p>
                                  <p className="text-xs text-text-muted">{new Date(o.createdAt).toLocaleDateString("th-TH")}</p>
                                  {o.stockOrderId && <p className="mt-0.5 font-mono text-[11px] text-success-text">บิล: {o.stockOrderId}</p>}
                                </td>
                                <td><p className="font-semibold text-text-heading">{o.customerName}</p><p className="text-xs text-text-muted">{o.customerTel}</p></td>
                                <td className="max-w-[220px]"><p className="truncate text-sm text-text-body">{o.items.map((i) => `${i.productName} x${i.quantity}`).join(", ")}</p>{o.shippingAddress && <p className="truncate text-xs text-text-muted">{o.shippingAddress}</p>}</td>
                                <td className="text-right font-display tabular-nums font-bold text-text-heading">฿{o.total?.toLocaleString()}</td>
                                <td className="text-center">
                                  <span className="badge-dd badge-info">
                                    {o.paymentMethod === "TRANSFER" ? <><Truck size={12} /> โอน+ส่ง</>
                                      : o.paymentMethod === "INSTALLMENT" ? <><CreditCard size={12} /> ผ่อน {o.installmentMonths}ด</>
                                      : <><Store size={12} /> รับที่ร้าน</>}
                                  </span>
                                  {o.paymentMethod === "INSTALLMENT" && o.downPayment != null && (
                                    <p className="mt-1 text-[11px] text-text-muted">ดาวน์ ฿{o.downPayment?.toLocaleString()}</p>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge-dd ${st.c}`}>{st.t}</span>
                                  {o.slipFileId && (
                                    o.slipVerified === true ? (
                                      <span className="mt-1 block text-[11px] font-semibold text-success-text">
                                        <CheckCircle2 size={11} className="mr-0.5 inline -translate-y-px" /> โอนแล้ว {o.slipAmount != null ? `฿${o.slipAmount.toLocaleString()}` : "ยอดตรง"} · พร้อม Approve
                                      </span>
                                    ) : o.slipVerified === false ? (
                                      <span className="mt-1 block text-[11px] font-medium text-error-text">
                                        <AlertTriangle size={11} className="mr-0.5 inline -translate-y-px" /> ยอดไม่ตรง/ซ้ำ — ตรวจก่อนกด
                                      </span>
                                    ) : (
                                      <span className="mt-1 block text-[11px] font-medium text-yellow-hover">
                                        <Clock size={11} className="mr-0.5 inline -translate-y-px" /> ระบบตรวจไม่ได้ — เปิดสลิปตรวจเอง
                                      </span>
                                    )
                                  )}
                                  {sla && (
                                    <span className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${sla.level === "red" ? "text-error-text" : sla.level === "yellow" ? "text-yellow-hover" : "text-success-text"}`}>
                                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${sla.level === "red" ? "bg-error-text" : sla.level === "yellow" ? "bg-yellow" : "bg-success-text"}`} />
                                      {sla.level === "red" ? `เกินกำหนด ${Math.floor(sla.hours)} ชม.` : `รอ ${Math.floor(sla.hours)} ชม.`}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {o.slipFileId && (
                                      <button onClick={() => viewSlip(o.id)} aria-label="ดูสลิป" className="rounded-lg border border-info-border bg-info-bg p-2 text-info-text transition-colors hover:bg-info-text hover:text-white"><Eye size={15} /></button>
                                    )}
                                    {active && (
                                      <>
                                        <button onClick={() => confirmWebOrder(o.id)} disabled={busyOrderId === o.id} aria-label="ยืนยัน" className="rounded-lg border border-success-border bg-success-bg p-2 text-success-text transition-colors hover:bg-success-text hover:text-white disabled:opacity-30">{busyOrderId === o.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}</button>
                                        <button onClick={() => rejectWebOrder(o.id)} disabled={busyOrderId === o.id} aria-label="ปฏิเสธ" className="rounded-lg border border-error-border bg-error-bg p-2 text-error-text transition-colors hover:bg-error-text hover:text-white disabled:opacity-30"><X size={15} /></button>
                                      </>
                                    )}
                                    {(() => {
                                      const na = nextFulfillAction(o);
                                      return na ? (
                                        <button
                                          onClick={() => na.needTracking ? setShipModal({ id: o.id }) : fulfill(o.id, na.status)}
                                          disabled={busyOrderId === o.id}
                                          className="whitespace-nowrap rounded-lg border border-info-border bg-info-bg px-2.5 py-2 text-xs font-semibold text-info-text transition-colors hover:bg-info-text hover:text-white disabled:opacity-30"
                                        >
                                          {busyOrderId === o.id ? <Loader2 size={13} className="animate-spin" /> : na.label} →
                                        </button>
                                      ) : null;
                                    })()}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredWeb.length > orderLimit && (
                    <div className="border-t border-border-default p-3 text-center">
                      <button onClick={() => setOrderLimit((n) => n + 20)} className="btn-ghost">
                        แสดงเพิ่ม ({filteredWeb.length - orderLimit} รายการที่เหลือ)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* คลังสินค้า (ดึงจากระบบ Stock) */}
              {activeMenu === "คลังสินค้า" && <StockInventory />}

              {/* บิลการขาย + ความเคลื่อนไหวสต็อก (Logs จาก Stock) */}
              {activeMenu === "บิล & สต็อก (Logs)" && <SalesLogs />}

              {/* ตารางผ่อน (overlay DD เอง) */}
              {activeMenu === "ตารางผ่อน" && <InstallmentManager />}

              {/* จัดการพนักงาน (ROLE_ADMIN เท่านั้น) */}
              {activeMenu === "จัดการพนักงาน" && <EmployeeManager />}

              {/* คูปองส่วนลด (จากวงล้อ) */}
              {activeMenu === "คูปองส่วนลด" && <CouponAdmin />}

              {/* โปรโมชั่น / Flash Sale */}
              {activeMenu === "โปรโมชั่น / Flash Sale" && <PromotionManager />}

              {/* รีวิวลูกค้า (ตอบกลับ/ลบ) */}
              {activeMenu === "รีวิวลูกค้า" && <ReviewAdmin />}

              {/* บริการที่ลูกค้าสนใจ (จากป๊อปอัพคัดกรอง) */}
              {activeMenu === "บริการที่ลูกค้าสนใจ" && <IntentStats />}
            </>
          )}
        </div>
      </main>

      {/* MODAL: ดูสลิปการโอน */}
      <AnimatePresence>
        {slipModal && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="สลิปการโอนเงิน" onClick={closeSlipModal}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="modal-dd max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button onClick={closeSlipModal} className="modal-close"><X size={20} /></button>
              <h2 className="card-title flex items-center gap-2"><Eye size={20} className="text-info-text" /> สลิปการโอนเงิน</h2>
              {/* blob: URL เป็นไฟล์ชั่วคราวใน browser จึงไม่ผ่าน Next image optimizer */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slipModal.url} alt="สลิปการโอน" className="mt-4 w-full rounded-lg border border-border-default" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: จัดส่ง — กรอกขนส่ง + เลขพัสดุ */}
      <AnimatePresence>
        {shipModal && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="จัดส่งออเดอร์" onClick={() => setShipModal(null)}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="modal-dd" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShipModal(null)} className="modal-close"><X size={20} /></button>
              <h2 className="card-title flex items-center gap-2"><Truck size={20} className="text-info-text" /> จัดส่งออเดอร์ #{shipModal.id}</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="ship-partner" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">ขนส่ง</label>
                  <input id="ship-partner" list="ship-partners" value={shipPartner} onChange={(e) => setShipPartner(e.target.value)} className="input-dd" placeholder="Flash / Kerry / J&T / ไปรษณีย์" />
                  <datalist id="ship-partners"><option value="Flash" /><option value="Kerry" /><option value="J&T" /><option value="ไปรษณีย์ไทย" /></datalist>
                </div>
                <div>
                  <label htmlFor="ship-track" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">เลขพัสดุ *</label>
                  <input id="ship-track" value={shipTracking} onChange={(e) => setShipTracking(e.target.value)} className="input-dd font-mono" placeholder="เช่น TH01234567890" />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setShipModal(null)} className="btn-ghost">ยกเลิก</button>
                <button
                  onClick={() => { if (!shipTracking.trim()) { toast.error("กรุณากรอกเลขพัสดุ"); return; } fulfill(shipModal.id, "SHIPPED", shipPartner.trim(), shipTracking.trim()); }}
                  disabled={busyOrderId === shipModal.id}
                  className="btn-primary"
                >
                  {busyOrderId === shipModal.id ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก</> : "ยืนยันจัดส่ง"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const menuItems = [
  { name: "ภาพรวมระบบ", icon: LayoutDashboard },
  { name: "คลังสินค้า", icon: Warehouse },
  { name: "คำสั่งซื้อ (เว็บ)", icon: ShoppingBag },
  { name: "บิล & สต็อก (Logs)", icon: Receipt },
  { name: "ตารางผ่อน", icon: CreditCard },
  { name: "คูปองส่วนลด", icon: TicketPercent },
  { name: "โปรโมชั่น / Flash Sale", icon: Zap },
  { name: "รีวิวลูกค้า", icon: Star },
  { name: "บริการที่ลูกค้าสนใจ", icon: Target },
  { name: "คำขอผ่อนสินค้า", icon: ClipboardList },
  { name: "จัดการลูกค้า", icon: Users },
  { name: "จัดการพนักงาน", icon: UserCog },
];

const ORDER_LABEL: Record<string, { t: string; c: string }> = {
  RESERVED: { t: "รอแนบสลิป", c: "badge-warning" },
  PENDING_REVIEW: { t: "รอตรวจสลิป", c: "badge-info" },
  PENDING_PICKUP: { t: "รอรับที่ร้าน", c: "badge-info" },
  CONFIRMED: { t: "ยืนยันแล้ว", c: "badge-success" },
  PREPARING: { t: "กำลังเตรียม", c: "badge-info" },
  SHIPPED: { t: "กำลังจัดส่ง", c: "badge-info" },
  DELIVERED: { t: "จัดส่งสำเร็จ", c: "badge-success" },
  READY_PICKUP: { t: "พร้อมรับ", c: "badge-info" },
  PICKED_UP: { t: "รับแล้ว", c: "badge-success" },
  COMPLETED: { t: "เสร็จสมบูรณ์", c: "badge-success" },
  REJECTED: { t: "ปฏิเสธแล้ว", c: "badge-error" },
};

// ============ คิวงาน SLA (กันออเดอร์ตกหล่น) ============
// SLA ต่อสถานะ (ชั่วโมง) เฉพาะขั้นที่ "พนักงานต้องลงมือ"
const SLA_HOURS: Record<string, number> = {
  PENDING_REVIEW: 2,   // ตรวจสลิป
  CONFIRMED: 24,       // เริ่มเตรียมของ
  PREPARING: 24,       // จัดส่ง
  READY_PICKUP: 72,    // รอลูกค้ามารับ
};

// เวลาเข้าสถานะปัจจุบัน (ใช้คิดว่ารอมานานแค่ไหน)
function statusSince(o: { status: string; createdAt: string; confirmedAt: string | null; preparingAt: string | null; shippedAt: string | null }): string | null {
  switch (o.status) {
    case "PENDING_REVIEW": return o.createdAt;
    case "CONFIRMED": return o.confirmedAt ?? o.createdAt;
    case "PREPARING": return o.preparingAt ?? o.confirmedAt ?? o.createdAt;
    case "READY_PICKUP": return o.shippedAt ?? o.createdAt;
    default: return null;
  }
}

interface Sla { hours: number; ratio: number; level: "green" | "yellow" | "red" }
function slaInfo(o: WebOrder): Sla | null {
  const target = SLA_HOURS[o.status];
  if (!target) return null;
  const since = statusSince(o);
  if (!since) return null;
  const t = new Date(since).getTime();
  if (isNaN(t)) return null;
  const hours = Math.max(0, (Date.now() - t) / 3_600_000);
  const ratio = hours / target;
  return { hours, ratio, level: ratio > 1 ? "red" : ratio > 0.5 ? "yellow" : "green" };
}

// สถานะปัจจุบัน → action ถัดไป (ตาม state machine ฝั่ง backend)
function nextFulfillAction(o: { status: string; shippingAddress: string | null }): { status: string; label: string; needTracking?: boolean } | null {
  switch (o.status) {
    case "CONFIRMED": return { status: "PREPARING", label: "เริ่มเตรียม" };
    case "PREPARING": return o.shippingAddress ? { status: "SHIPPED", label: "จัดส่ง", needTracking: true } : { status: "READY_PICKUP", label: "พร้อมรับ" };
    case "SHIPPED": return { status: "DELIVERED", label: "ส่งถึงแล้ว" };
    case "READY_PICKUP": return { status: "PICKED_UP", label: "รับแล้ว" };
    case "DELIVERED": case "PICKED_UP": return { status: "COMPLETED", label: "ปิดงาน" };
    default: return null;
  }
}
