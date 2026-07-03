"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, TicketPercent, CheckCircle2, Clock } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

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

  useEffect(() => {
    api.get("/admin/coupons")
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("โหลดคูปองไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total: list.length,
    used: list.filter((c) => c.used).length,
    active: list.filter((c) => !c.used && !expired(c.expiresAt)).length,
  }), [list]);

  if (loading) return <div className="flex justify-center py-20 text-yellow-hover"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "คูปองทั้งหมด", value: stats.total, icon: TicketPercent, color: "text-text-heading" },
          { label: "ใช้แล้ว", value: stats.used, icon: CheckCircle2, color: "text-success-text" },
          { label: "ยังใช้ได้", value: stats.active, icon: Clock, color: "text-info-text" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border-default bg-white p-4">
            <div className="flex items-center gap-2 text-text-muted"><s.icon size={16} /> <span className="text-xs">{s.label}</span></div>
            <p className={`mt-1 font-display text-3xl tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-default bg-white">
        <table className="table-dd">
          <thead><tr><th>เจ้าของ (อีเมล)</th><th>โค้ด</th><th>ส่วนลด</th><th>ประเภท</th><th>สถานะ</th><th>หมดอายุ</th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-text-muted">ยังไม่มีคูปอง</td></tr>
            ) : list.map((c) => (
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
