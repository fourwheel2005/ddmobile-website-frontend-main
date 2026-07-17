"use client";
import { useEffect, useMemo, useState } from "react";
import { TicketPercent, CheckCircle2, Clock, Search, Gift, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import { TableSkeleton } from "@/components/Skeletons";

interface Coupon {
  id: number;
  userEmail: string;
  code: string;
  percent: number;
  type: string;
  used: boolean;
  createdAt: string | null;
  expiresAt: string | null;
}

const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }) : "-");
const expired = (s: string | null) => (s ? new Date(s).getTime() < Date.now() : false);

export default function CouponAdmin() {
  const [list, setList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [wheelOn, setWheelOn] = useState<boolean | null>(null);   // null = กำลังโหลด
  const [savingWheel, setSavingWheel] = useState(false);

  useEffect(() => {
    api.get("/admin/coupons")
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("โหลดคูปองไม่สำเร็จ"))
      .finally(() => setLoading(false));
    api.get("/admin/settings/wheel")
      .then((r) => setWheelOn(!!r.data?.enabled))
      .catch(() => setWheelOn(true));   // โหลดพลาด → เดาว่าเปิด (ค่า default)
  }, []);

  const toggleWheel = async () => {
    if (wheelOn === null || savingWheel) return;
    const next = !wheelOn;
    setSavingWheel(true);
    try {
      const r = await api.put("/admin/settings/wheel", { enabled: next });
      setWheelOn(!!r.data?.enabled);
      toast.success(next ? "เปิดวงล้อต้อนรับแล้ว" : "ปิดวงล้อต้อนรับแล้ว");
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSavingWheel(false);
    }
  };

  const stats = useMemo(() => ({
    total: list.length,
    used: list.filter((c) => c.used).length,
    active: list.filter((c) => !c.used && !expired(c.expiresAt)).length,
  }), [list]);

  const filtered = q.trim()
    ? list.filter((c) => `${c.userEmail} ${c.code}`.toLowerCase().includes(q.trim().toLowerCase()))
    : list;

  if (loading) return <div className="overflow-hidden rounded-2xl border border-border-default bg-white"><TableSkeleton rows={6} cols={6} /></div>;

  return (
    <div className="space-y-5">
      {/* เปิด/ปิดวงล้อต้อนรับสมาชิกใหม่ (ป๊อปอัพหน้าเว็บ) */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-default bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-yellow/15 text-yellow-hover"><Gift size={20} /></span>
          <div>
            <p className="font-semibold text-text-heading">วงล้อต้อนรับสมาชิกใหม่</p>
            <p className="text-xs text-text-muted">
              {wheelOn === null ? "กำลังโหลด..."
                : wheelOn ? "เปิดอยู่ — ลูกค้าที่ล็อกอินและยังไม่เคยหมุน จะเห็นป๊อปอัพวงล้อ"
                : "ปิดอยู่ — ป๊อปอัพวงล้อจะไม่แสดงหน้าเว็บ"}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!wheelOn}
          aria-label="เปิด/ปิดวงล้อต้อนรับ"
          disabled={wheelOn === null || savingWheel}
          onClick={toggleWheel}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${wheelOn ? "bg-yellow" : "bg-border-default"}`}
        >
          {savingWheel
            ? <Loader2 size={12} className="mx-auto animate-spin text-white" />
            : <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${wheelOn ? "translate-x-6" : "translate-x-1"}`} />}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "คูปองทั้งหมด", value: stats.total, icon: TicketPercent, color: "text-text-heading" },
          { label: "ใช้แล้ว", value: stats.used, icon: CheckCircle2, color: "text-success-text" },
          { label: "ยังใช้ได้", value: stats.active, icon: Clock, color: "text-info-text" },
        ].map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} unit="ใบ" iconClass={s.color} />
        ))}
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาอีเมล / โค้ด..." aria-label="ค้นหาคูปอง" className="input-dd min-h-0 py-2 pl-9 text-sm" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-default bg-white">
        <table className="table-dd">
          <thead><tr><th>เจ้าของ (อีเมล)</th><th>โค้ด</th><th>ส่วนลด</th><th>ประเภท</th><th>สถานะ</th><th>หมดอายุ</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-text-muted">{list.length === 0 ? "ยังไม่มีคูปอง" : "ไม่พบคูปองที่ค้นหา"}</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id}>
                <td className="text-xs text-text-muted">{c.userEmail}</td>
                <td className="font-mono font-semibold text-text-heading">{c.code}</td>
                <td><span className="badge-dd badge-warning">{c.percent}%</span></td>
                <td className="text-xs">{c.type}</td>
                <td>
                  {c.used ? <span className="badge-dd badge-success">ใช้แล้ว</span>
                    : expired(c.expiresAt) ? <span className="badge-dd badge-error">หมดอายุ</span>
                    : <span className="badge-dd badge-info">ยังใช้ได้</span>}
                </td>
                <td className="text-xs text-text-muted">{fmt(c.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
