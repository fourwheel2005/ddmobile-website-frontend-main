"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Copy, IdCard, Phone } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { baht } from "@/lib/money";
import { lineChatUrl } from "@/lib/contact";
import { TableSkeleton } from "@/components/Skeletons";
import StatCard from "@/components/ui/StatCard";
import ProtectedImageViewer from "@/components/ProtectedImageViewer";

interface InstallmentRequest {
  id: number; refCode: string;
  catalogId: string | null; productName: string; color: string | null; storage: string | null;
  conditionLabel: string | null; serialOrSku: string | null; price: number | null;
  planLabel: string | null; downPayment: number | null; months: number | null; monthly: number | null;
  name: string; tel: string; subdistrict: string | null; district: string | null; province: string | null; zipcode: string | null;
  note: string | null; userEmail: string | null;
  hasIdCard: boolean; idCardPurgedAt: string | null; consentAt: string;
  status: string; statusChangedAt: string | null; handledBy: string | null; adminNote: string | null;
  version: number; createdAt: string;
}
interface PageResult {
  content: InstallmentRequest[]; page: number; totalPages: number; totalElements: number; last: boolean; pendingCount: number;
}

/** ต้องตรงกับ backend InstallmentRequestService.NEXT */
const STATUS: Record<string, { label: string; cls: string; next: string[] }> = {
  NEW: { label: "ใหม่", cls: "badge-warning", next: ["CONTACTED", "APPROVED", "REJECTED", "ARCHIVED"] },
  CONTACTED: { label: "ติดต่อแล้ว", cls: "badge-info", next: ["APPROVED", "REJECTED", "ARCHIVED"] },
  APPROVED: { label: "อนุมัติ", cls: "badge-success", next: ["ARCHIVED"] },
  REJECTED: { label: "ไม่อนุมัติ", cls: "badge-error", next: ["ARCHIVED"] },
  ARCHIVED: { label: "พับเก็บ", cls: "bg-bg-subtle text-text-muted", next: [] },
};
const FILTERS = [{ value: "", label: "ที่ยังเปิดอยู่" }, ...Object.entries(STATUS).map(([value, m]) => ({ value, label: m.label }))];
const PAGE_SIZE = 20;

/**
 * คิว "คำขอผ่อนเครื่อง" — จากหน้าสินค้า (ยืนยันผ่อนเครื่องนี้) และฟอร์มเลือกบริการ
 * บัตรประชาชนโหลดเมื่อกดดูเท่านั้น (ไม่ cache) · ลบอัตโนมัติตามระยะเก็บรักษา
 */
export default function InstallmentRequestsAdmin({ onPendingCount }: { onPendingCount?: (n: number) => void }) {
  const [data, setData] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [idCardOf, setIdCardOf] = useState<InstallmentRequest | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get<PageResult>("/admin/installment-requests", { params: { page, size: PAGE_SIZE, status: status || undefined } })
      .then((r) => { setData(r.data); onPendingCount?.(r.data.pendingCount); })
      .catch((e) => toast.error(getApiError(e, "โหลดคำขอผ่อนไม่สำเร็จ")))
      .finally(() => setLoading(false));
  }, [page, status, onPendingCount]);
  useEffect(() => { load(); }, [load]);

  // อัปเดตแถวเดียวจาก response (ไม่โหลดทั้งหน้าใหม่) · version ใหม่จาก server กัน 409 รอบถัดไป
  const update = async (r: InstallmentRequest, body: { status: string; adminNote?: string | null }) => {
    setBusyId(r.id);
    try {
      const { data: updated } = await api.post<InstallmentRequest>(`/admin/installment-requests/${r.id}/status`, { ...body, expectedVersion: r.version });
      setData((d) => d && { ...d, content: d.content.map((x) => (x.id === r.id ? updated : x)) });
      toast.success("บันทึกแล้ว");
      if (r.status === "NEW" && updated.status !== "NEW") load();   // pendingCount เปลี่ยน
    } catch (e) {
      toast.error(getApiError(e, "บันทึกไม่สำเร็จ"));
      load();
    } finally {
      setBusyId(null);
    }
  };

  const editNote = (r: InstallmentRequest) => {
    const note = window.prompt("โน้ตภายใน (ลูกค้าไม่เห็น)", r.adminNote ?? "");
    if (note === null) return;
    void update(r, { status: r.status, adminNote: note });
  };

  const idCardImages = useMemo(
    () => (idCardOf ? [{ path: `/admin/installment-requests/${idCardOf.id}/id-card`, label: "บัตรประชาชน" }] : []),
    [idCardOf],
  );

  const rows = data?.content ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={ClipboardList} label="คำขอผ่อน (ตามตัวกรอง)" value={data?.totalElements ?? 0} unit="รายการ" iconClass="text-yellow" />
        <StatCard icon={Phone} label="คำขอใหม่ ยังไม่ติดต่อ" value={data?.pendingCount ?? 0} unit="รายการ" iconClass="text-error-text" />
      </div>

      <div className="card-dd">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-text-heading">คิวคำขอผ่อนเครื่อง</h3>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" onClick={() => { setStatus(f.value); setPage(0); }}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${status === f.value ? "border-text-heading bg-text-heading text-white" : "border-border-default text-text-body hover:border-yellow"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? <TableSkeleton /> : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">ยังไม่มีคำขอผ่อนในตัวกรองนี้</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const meta = STATUS[r.status] ?? STATUS.NEW;
              const area = [r.subdistrict && `ต.${r.subdistrict}`, r.district && `อ.${r.district}`, r.province && `จ.${r.province}`, r.zipcode].filter(Boolean).join(" ");
              return (
                <div key={r.id} className={`rounded-2xl border p-4 ${r.status === "NEW" ? "border-yellow/50 bg-white" : "border-border-default bg-bg-subtle"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-bold text-text-heading">
                        {r.productName}
                        <span className={`badge-dd ${meta.cls}`}>{meta.label}</span>
                        <span className="font-mono text-xs font-normal text-text-muted">{r.refCode}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {[r.color, r.storage, r.conditionLabel, r.serialOrSku].filter(Boolean).join(" · ") || "ลูกค้าระบุรุ่นเอง"}
                      </p>
                      <p className="mt-1 text-sm text-text-body">
                        {r.name} · <a href={`tel:${r.tel.replace(/\D/g, "")}`} className="font-semibold text-yellow-text hover:underline">{r.tel}</a>
                        {area && <> · {area}</>}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {fmt(r.createdAt)}{r.userEmail ? ` · ${r.userEmail}` : ""}{r.handledBy ? ` · ดูแลโดย ${r.handledBy}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      {r.price != null && <p className="font-bold text-price">{baht(r.price)}</p>}
                      {r.downPayment != null && <p className="text-xs text-text-muted">ดาวน์ {baht(r.downPayment)}</p>}
                      {r.monthly != null && r.months && <p className="text-xs text-text-muted">{baht(r.monthly)} × {r.months} ด.</p>}
                      {r.planLabel && <p className="max-w-[16rem] truncate text-xs text-text-muted">{r.planLabel}</p>}
                    </div>
                  </div>

                  {r.note && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-text-body">หมายเหตุลูกค้า: {r.note}</p>}
                  {r.adminNote && <p className="mt-2 rounded-lg bg-yellow/10 px-3 py-2 text-xs text-text-body">โน้ตภายใน: {r.adminNote}</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {r.hasIdCard ? (
                      <button type="button" onClick={() => setIdCardOf(r)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-yellow bg-yellow/10 px-3 py-1.5 text-xs font-bold text-text-heading hover:bg-yellow/20">
                        <IdCard size={13} /> ดูบัตรประชาชน
                      </button>
                    ) : (
                      <span className="text-xs text-text-muted">{r.idCardPurgedAt ? `บัตรประชาชนถูกลบแล้ว (${fmt(r.idCardPurgedAt)})` : "ไม่มีบัตรประชาชน"}</span>
                    )}
                    {meta.next.length > 0 && (
                      <select aria-label="เปลี่ยนสถานะ" disabled={busyId === r.id} value=""
                        onChange={(e) => { const t = e.target.value; if (t) void update(r, { status: t }); }}
                        className="input-dd min-h-0 w-auto py-1.5 text-xs">
                        <option value="">{busyId === r.id ? "กำลังบันทึก…" : "เปลี่ยนสถานะ →"}</option>
                        {meta.next.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                      </select>
                    )}
                    <button type="button" onClick={() => editNote(r)} disabled={busyId === r.id}
                      className="rounded-full border border-border-default bg-white px-3 py-1.5 text-xs font-bold text-text-heading hover:border-yellow">
                      โน้ตภายใน
                    </button>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(`คำขอผ่อน ${r.refCode}\n${r.productName}\n${r.name} ${r.tel}`).then(() => toast.success("คัดลอกแล้ว"), () => toast.error("คัดลอกไม่สำเร็จ"))}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-white px-3 py-1.5 text-xs font-bold text-text-heading hover:border-yellow">
                      <Copy size={13} /> คัดลอก
                    </button>
                    <a href={lineChatUrl()} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-yellow-text hover:underline">เปิด LINE OA</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button type="button" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-full border border-border-default px-3 py-1.5 text-xs font-semibold text-text-body disabled:opacity-40">
              <ChevronLeft size={14} /> ก่อนหน้า
            </button>
            <span className="text-xs text-text-muted">หน้า {page + 1} / {data.totalPages}</span>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={data.last}
              className="inline-flex items-center gap-1 rounded-full border border-border-default px-3 py-1.5 text-xs font-semibold text-text-body disabled:opacity-40">
              ถัดไป <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {idCardOf && (
        <ProtectedImageViewer title={`${idCardOf.name} · ${idCardOf.refCode}`} images={idCardImages} onClose={() => setIdCardOf(null)} />
      )}
    </div>
  );
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
