"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Smartphone, ClipboardList, Users, Settings,
  LogOut, Bell, Search, Clock, CheckCircle2, XCircle, Loader2,
  X, AlertTriangle, Warehouse, Menu,
  ShoppingBag, Check, Eye, Truck, Store, CreditCard, Receipt
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import StockInventory from "@/components/StockInventory";
import SalesLogs from "@/components/SalesLogs";
import CountUp from "@/components/CountUp";

interface InstallmentApp {
  id: number;
  customerName: string;
  customerTel: string;
  productName: string;
  applicationDate: string;
  status: string;
}

interface DashboardStats {
  pendingRequests: number;
  approvedThisMonth: number;
  stockCount: number;
  estimatedRevenue: string;
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
  items: WebOrderItem[]; slipFileId: string | null; slipVerified: boolean | null;
  installmentMonths: number | null; downPayment: number | null; monthlyPayment: number | null;
  stockOrderId: string | null;
}

interface StockSummary { totalAvailable: number; newAvailable: number; secondHandAvailable: number; }
interface StockLowItem { id: string; sku: string; productName: string; currentQty: number; thresholdQty: number; }
function toArr<T>(d: any): T[] { return Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []); }

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState("ภาพรวมระบบ");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [applications, setApplications] = useState<InstallmentApp[]>([]);
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [webOrders, setWebOrders] = useState<WebOrder[]>([]);
  const [slipModal, setSlipModal] = useState<{ url: string } | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  // Stock real-time (ผ่าน DD BFF — ไม่ต้อง login stock แยก)
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [stockLow, setStockLow] = useState<StockLowItem[]>([]);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        window.location.href = "/login";
        return false;
      }

      const user = JSON.parse(userStr);
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
        const [statsRes, appsRes, customersRes, ordersRes, sumRes, lowRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/applications"),
          api.get("/admin/customers"),
          api.get("/admin/orders"),
          api.get("/admin/stock/summary").catch(() => null),   // stock ล่มไม่ทำให้ทั้ง dashboard พัง
          api.get("/admin/stock/low-stock").catch(() => null),
        ]);

        setStatsData(statsRes.data);
        setApplications(appsRes.data);
        setCustomers(customersRes.data);
        setWebOrders(ordersRes.data);
        setStockSummary(sumRes?.data ?? null);
        setStockLow(toArr<StockLowItem>(lowRes?.data));
      } catch (error: any) {
        console.error("Fetch Data Error:", error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
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
    if (!confirm("ยืนยันคำสั่งซื้อนี้? ระบบจะตัดสต็อกจริงที่คลังทันที")) return;
    setBusyOrderId(id);
    try {
      const res = await api.post(`/admin/orders/${id}/confirm`);
      setWebOrders(prev => prev.map(o => o.id === id ? res.data : o));
      toast.success("ยืนยันออเดอร์ + ตัดสต็อกสำเร็จ!");
    } catch (error: any) {
      toast.error(getApiError(error, "ยืนยันไม่สำเร็จ (อาจมีสินค้าถูกขายไปแล้ว)"));
    } finally {
      setBusyOrderId(null);
    }
  };

  const rejectWebOrder = async (id: number) => {
    if (!confirm("ปฏิเสธคำสั่งซื้อนี้? สินค้าที่จองไว้จะถูกปล่อยคืน")) return;
    setBusyOrderId(id);
    try {
      const res = await api.post(`/admin/orders/${id}/reject`);
      setWebOrders(prev => prev.map(o => o.id === id ? res.data : o));
      toast.success("ปฏิเสธคำสั่งซื้อแล้ว");
    } catch (error: any) {
      toast.error(getApiError(error, "ทำรายการไม่สำเร็จ"));
    } finally {
      setBusyOrderId(null);
    }
  };

  const viewSlip = async (id: number) => {
    try {
      const res = await api.get(`/admin/orders/${id}/slip`, { responseType: "blob" });
      setSlipModal({ url: URL.createObjectURL(res.data) });
    } catch {
      toast.error("ไม่พบสลิปของออเดอร์นี้");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-base text-yellow">
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  // ภาพรวมขับเคลื่อนด้วย Stock real-time (จาก /admin/stock/summary) + คำสั่งซื้อรอดำเนินการ
  const pendingOrders = webOrders.filter(o => ["RESERVED", "PENDING_REVIEW", "PENDING_PICKUP"].includes(o.status)).length;

  const statsUI = [
    { title: "พร้อมขายทั้งหมด", value: stockSummary?.totalAvailable ?? 0, growth: "เครื่อง", icon: Warehouse, color: "text-yellow" },
    { title: "เครื่องใหม่ (มือ 1)", value: stockSummary?.newAvailable ?? 0, growth: "พร้อมส่ง", icon: CheckCircle2, color: "text-success-text" },
    { title: "เครื่องมือสอง (มือ 2)", value: stockSummary?.secondHandAvailable ?? 0, growth: "พร้อมส่ง", icon: Smartphone, color: "text-info-text" },
    { title: "คำสั่งซื้อรอดำเนินการ", value: pendingOrders, growth: "ออเดอร์", icon: ShoppingBag, color: "text-error-text" },
  ];

  return (
    <div className="relative flex h-screen overflow-hidden bg-bg-base text-text-body">

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
              className={`flex w-full items-center gap-3 px-4 py-3 font-display text-sm uppercase tracking-wider transition-colors ${
                activeMenu === item.name ? "bg-yellow text-black" : "text-text-muted hover:bg-bg-tinted hover:text-text-heading"
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="border-t border-border-default p-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 font-display text-sm uppercase tracking-wider text-error-text transition-colors hover:bg-error-bg">
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
              <p className="hidden text-xs text-text-muted sm:block">ระบบหลังบ้านเชื่อมต่อ API เรียบร้อยแล้ว</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input type="text" placeholder="ค้นหา..." aria-label="ค้นหา" className="input-dd w-56 pl-11" />
            </div>
            <button aria-label="การแจ้งเตือน" className="relative p-2 text-text-muted hover:text-yellow">
              <Bell size={22} />
              <span className="absolute right-1 top-1 h-2 w-2 bg-error-text" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center text-yellow">
              <Loader2 size={48} className="mb-4 animate-spin" />
              <p className="font-display uppercase tracking-widest">กำลังโหลดข้อมูล</p>
            </div>
          ) : (
            <>
              {/* ภาพรวมระบบ */}
              {activeMenu === "ภาพรวมระบบ" && (
                <div className="stagger-children">
                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                    {statsUI.map((stat, idx) => (
                      <div key={idx} className="card-dd">
                        <div className="mb-4 flex items-start justify-between">
                          <div className={`flex h-11 w-11 items-center justify-center bg-bg-tinted ${stat.color}`}>
                            <stat.icon size={22} />
                          </div>
                          <span className="badge-dd badge-warning">{stat.growth}</span>
                        </div>
                        <p className="text-xs text-text-muted">{stat.title}</p>
                        <CountUp value={stat.value} className="block font-display text-4xl tabular-nums text-text-heading" />
                      </div>
                    ))}
                  </div>

                  <div className="border border-border-default">
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
                            <tr><td colSpan={4} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">สินค้าทุกรุ่นมีสต็อกเพียงพอ 🎉</td></tr>
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
                <div className="border border-border-default">
                  <div className="border-b border-border-default bg-bg-surface p-4">
                    <h2 className="font-display text-xl">คำขอผ่อนสินค้าล่าสุด (ยื่นผ่านระบบ)</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-dd">
                      <thead>
                        <tr><th>ลูกค้า</th><th>รุ่นสินค้า</th><th>วันที่ยื่นเรื่อง</th><th>สถานะ</th><th className="text-right">จัดการ</th></tr>
                      </thead>
                      <tbody>
                        {applications.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">ยังไม่มีข้อมูลคำขอผ่อนสินค้าผ่านระบบเว็บ</td></tr>
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
                              <td className="text-right"><button className="btn-ghost">ตรวจสอบ →</button></td>
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
                <div className="border border-border-default">
                  <div className="flex items-center justify-between border-b border-border-default bg-bg-surface p-4">
                    <h2 className="flex items-center gap-2 font-display text-xl"><Users className="text-yellow" size={20} /> รายชื่อลูกค้าทั้งหมด</h2>
                    <span className="badge-dd badge-warning">จำนวนลูกค้า: {customers.length} คน</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-dd">
                      <thead>
                        <tr><th>รหัสลูกค้า</th><th>บัญชี (Email)</th><th>ระดับสิทธิ์</th><th>สถานะบัญชี</th><th className="text-right">จัดการ</th></tr>
                      </thead>
                      <tbody>
                        {customers.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">ยังไม่มีข้อมูลลูกค้าในระบบ</td></tr>
                        ) : (
                          customers.map((customer) => (
                            <tr key={customer.id} className="group">
                              <td className="text-text-muted">CUST-{customer.id.toString().padStart(4, "0")}</td>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center bg-bg-tinted font-display uppercase text-yellow">{customer.email.charAt(0)}</div>
                                  <p className="font-semibold text-text-heading">{customer.email}</p>
                                </div>
                              </td>
                              <td><span className="badge-dd badge-info">ลูกค้าทั่วไป</span></td>
                              <td><span className="badge-dd badge-success"><CheckCircle2 size={12} /> ปกติ (Active)</span></td>
                              <td className="text-right"><button className="btn-ghost opacity-0 group-hover:opacity-100">ดูประวัติ →</button></td>
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
                <div className="border border-border-default">
                  <div className="flex items-center justify-between border-b border-border-default bg-bg-surface p-4">
                    <h2 className="flex items-center gap-2 font-display text-xl"><ShoppingBag className="text-yellow" size={20} /> คำสั่งซื้อจากหน้าเว็บ</h2>
                    <span className="badge-dd badge-warning">{webOrders.length} รายการ</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-dd">
                      <thead>
                        <tr><th>ออเดอร์</th><th>ลูกค้า</th><th>สินค้า</th><th className="text-right">ยอด</th><th className="text-center">รับสินค้า</th><th>สถานะ</th><th className="text-right">จัดการ</th></tr>
                      </thead>
                      <tbody>
                        {webOrders.length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">ยังไม่มีคำสั่งซื้อจากเว็บ</td></tr>
                        ) : (
                          webOrders.map((o) => {
                            const st = ORDER_LABEL[o.status] || ORDER_LABEL.RESERVED;
                            const active = o.status !== "CONFIRMED" && o.status !== "REJECTED";
                            return (
                              <tr key={o.id}>
                                <td>
                                  <p className="font-semibold text-text-heading">#{o.id}</p>
                                  <p className="text-xs text-text-muted">{new Date(o.createdAt).toLocaleDateString("th-TH")}</p>
                                  {o.stockOrderId && <p className="mt-0.5 font-mono text-[10px] text-success-text">บิล: {o.stockOrderId}</p>}
                                </td>
                                <td><p className="font-semibold text-text-heading">{o.customerName}</p><p className="text-xs text-text-muted">{o.customerTel}</p></td>
                                <td className="max-w-[220px]"><p className="truncate text-sm text-text-body">{o.items.map((i) => `${i.productName} x${i.quantity}`).join(", ")}</p>{o.shippingAddress && <p className="truncate text-xs text-text-muted">{o.shippingAddress}</p>}</td>
                                <td className="text-right font-display tabular-nums text-yellow">฿{o.total?.toLocaleString()}</td>
                                <td className="text-center">
                                  <span className="badge-dd badge-info">
                                    {o.paymentMethod === "TRANSFER" ? <><Truck size={12} /> โอน+ส่ง</>
                                      : o.paymentMethod === "INSTALLMENT" ? <><CreditCard size={12} /> ผ่อน {o.installmentMonths}ด</>
                                      : <><Store size={12} /> รับที่ร้าน</>}
                                  </span>
                                  {o.paymentMethod === "INSTALLMENT" && o.downPayment != null && (
                                    <p className="mt-1 text-[10px] text-text-muted">ดาวน์ ฿{o.downPayment?.toLocaleString()}</p>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge-dd ${st.c}`}>{st.t}</span>
                                  {o.slipFileId && o.slipVerified != null && (
                                    <span className={`mt-1 block text-[10px] font-medium ${o.slipVerified ? "text-success-text" : "text-error-text"}`}>
                                      {o.slipVerified ? "✓ สลิปยอดตรง" : "⚠ ยอดไม่ตรง/ซ้ำ"}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {o.slipFileId && (
                                      <button onClick={() => viewSlip(o.id)} aria-label="ดูสลิป" className="border border-info-border bg-info-bg p-1.5 text-info-text transition-colors hover:bg-info-text hover:text-black"><Eye size={15} /></button>
                                    )}
                                    {active && (
                                      <>
                                        <button onClick={() => confirmWebOrder(o.id)} disabled={busyOrderId === o.id} aria-label="ยืนยัน" className="border border-success-border bg-success-bg p-1.5 text-success-text transition-colors hover:bg-success-text hover:text-black disabled:opacity-30">{busyOrderId === o.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}</button>
                                        <button onClick={() => rejectWebOrder(o.id)} disabled={busyOrderId === o.id} aria-label="ปฏิเสธ" className="border border-error-border bg-error-bg p-1.5 text-error-text transition-colors hover:bg-error-text hover:text-black disabled:opacity-30"><X size={15} /></button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* คลังสินค้า (ดึงจากระบบ Stock) */}
              {activeMenu === "คลังสินค้า" && <StockInventory />}

              {/* บิลการขาย + ความเคลื่อนไหวสต็อก (Logs จาก Stock) */}
              {activeMenu === "บิล & สต็อก (Logs)" && <SalesLogs />}
            </>
          )}
        </div>
      </main>

      {/* MODAL: ดูสลิปการโอน */}
      <AnimatePresence>
        {slipModal && (
          <div className="modal-backdrop" onClick={() => setSlipModal(null)}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="modal-dd max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSlipModal(null)} className="modal-close"><X size={20} /></button>
              <h2 className="card-title flex items-center gap-2"><Eye size={20} className="text-info-text" /> สลิปการโอนเงิน</h2>
              <img src={slipModal.url} alt="สลิปการโอน" className="mt-4 w-full rounded-lg border border-border-default" />
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
  { name: "คำขอผ่อนสินค้า", icon: ClipboardList },
  { name: "จัดการลูกค้า", icon: Users },
  { name: "ตั้งค่าระบบ", icon: Settings },
];

const ORDER_LABEL: Record<string, { t: string; c: string }> = {
  RESERVED: { t: "รอแนบสลิป", c: "badge-warning" },
  PENDING_REVIEW: { t: "รอตรวจสลิป", c: "badge-info" },
  PENDING_PICKUP: { t: "รอรับที่ร้าน", c: "badge-info" },
  CONFIRMED: { t: "ยืนยันแล้ว", c: "badge-success" },
  REJECTED: { t: "ปฏิเสธแล้ว", c: "badge-error" },
};
