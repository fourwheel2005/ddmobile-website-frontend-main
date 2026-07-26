"use client";
import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, Trash2, Check, RotateCcw, Copy, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { baht } from "@/lib/money";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { TableSkeleton } from "@/components/Skeletons";
import StatCard from "@/components/ui/StatCard";
import {
  DEVICE_TYPES, STORAGES, REGIONS, BATTERY, ACCESSORIES, WARRANTY, BODY, SCREEN,
  labelOf, problemsLabel,
} from "@/lib/tradeIn";

interface TradeInRequest {
  id: number; refCode: string | null;
  deviceType: string; model: string; storage: string; color: string | null; region: string;
  battery: string; accessories: string; warranty: string; body: string; screen: string; problems: string[];
  name: string; tel: string; zipcode: string;
  estimatedPrice: number | null; userEmail: string | null;
  handled: boolean; createdAt: string;
}
interface PageResult {
  content: TradeInRequest[]; page: number; totalPages: number; totalElements: number;
  last: boolean; pendingCount: number;
}

const PAGE_SIZE = 20;

/**
 * คำขอประเมิน "ไอโฟนแลกเงิน" ที่ลูกค้าส่งจากหน้า /trade-in
 * เก็บคู่ขนานกับแชท LINE — ถ้า deep link ไม่ prefill ข้อความ คิวนี้คือที่เดียวที่ยังตามลูกค้าต่อได้
 */
export default function TradeInRequests() {
  const [data, setData] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/trade-in/requests", { params: { page, size: PAGE_SIZE, pendingOnly } })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(getApiError(e, "โหลดคำขอไม่สำเร็จ")))
      .finally(() => setLoading(false));
  }, [page, pendingOnly]);
  useEffect(() => { load(); }, [load]);

  // สลับตัวกรอง → กลับหน้าแรกเสมอ (ไม่งั้นค้างหน้า 5 ของชุดเดิมแล้วเห็นตารางว่าง)
  const toggleFilter = () => { setPendingOnly((v) => !v); setPage(0); };

  const setHandled = async (r: TradeInRequest, value: boolean) => {
    setBusyId(r.id);
    try {
      await api.put(`/admin/trade-in/requests/${r.id}/handled`, null, { params: { value } });
      toast.success(value ? "ทำเครื่องหมายว่าติดต่อแล้ว" : "กลับไปเป็นยังไม่ติดต่อ");
      load();
    } catch (e) { toast.error(getApiError(e, "อัปเดตไม่สำเร็จ")); }
    finally { setBusyId(null); }
  };

  const del = async (r: TradeInRequest) => {
    if (!(await confirmDialog({ title: `ลบคำขอของ "${r.name}"?`, confirmText: "ลบ", danger: true }))) return;
    try { await api.delete(`/admin/trade-in/requests/${r.id}`); toast.success("ลบแล้ว"); load(); }
    catch (e) { toast.error(getApiError(e, "ลบไม่สำเร็จ")); }
  };

  const copyDetail = (r: TradeInRequest) => {
    navigator.clipboard?.writeText(detailText(r)).then(
      () => toast.success("คัดลอกรายละเอียดแล้ว"),
      () => toast.error("คัดลอกไม่สำเร็จ"),
    );
  };

  const rows = data?.content ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Inbox} label="คำขอประเมินทั้งหมด" value={data?.totalElements ?? 0} unit="รายการ" iconClass="text-yellow" />
        <StatCard icon={Phone} label="ยังไม่ได้ติดต่อกลับ" value={data?.pendingCount ?? 0} unit="รายการ" iconClass="text-error-text" />
      </div>

      <div className="card-dd">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-text-heading">คิวคำขอประเมิน (ไอโฟนแลกเงิน)</h3>
          <button
            type="button"
            onClick={toggleFilter}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              pendingOnly ? "border-yellow bg-yellow text-on-yellow" : "border-border-default text-text-body hover:border-yellow"
            }`}
          >
            {pendingOnly ? "กำลังดู: ยังไม่ติดต่อ" : "ดูทั้งหมด"}
          </button>
        </div>

        {loading ? <TableSkeleton /> : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            {pendingOnly ? "ไม่มีคำขอที่ค้างติดต่อ" : "ยังไม่มีคำขอประเมินเข้ามา"}
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className={`rounded-2xl border p-4 ${r.handled ? "border-border-default bg-bg-subtle" : "border-yellow/50 bg-white"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-text-heading">
                      {r.model} {r.storage}
                      {r.handled
                        ? <span className="badge-dd badge-success">ติดต่อแล้ว</span>
                        : <span className="badge-dd badge-warning">รอติดต่อ</span>}
                      {r.refCode && <span className="font-mono text-xs font-normal text-text-muted">{r.refCode}</span>}
                    </p>
                    <p className="mt-1 text-sm text-text-body">
                      {r.name} · <a href={`tel:${r.tel.replace(/\D/g, "")}`} className="font-semibold text-yellow-text hover:underline">{r.tel}</a> · {r.zipcode}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">{formatThaiDateTime(r.createdAt)}{r.userEmail ? ` · ${r.userEmail}` : ""}</p>
                  </div>
                  {r.estimatedPrice != null && (
                    <div className="text-right">
                      <p className="text-xs text-text-muted">ราคาที่เว็บโชว์</p>
                      <p className="text-lg font-bold text-price">{baht(r.estimatedPrice)}</p>
                    </div>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border-default pt-3 text-xs sm:grid-cols-3">
                  <Row label="ประเภท" value={labelOf(DEVICE_TYPES, r.deviceType)} />
                  <Row label="ความจุ" value={labelOf(STORAGES, r.storage)} />
                  {r.color && <Row label="สี" value={r.color} />}
                  <Row label="เวอร์ชัน" value={labelOf(REGIONS, r.region)} />
                  <Row label="แบต" value={labelOf(BATTERY, r.battery)} />
                  <Row label="อุปกรณ์" value={labelOf(ACCESSORIES, r.accessories)} />
                  <Row label="ประกัน" value={labelOf(WARRANTY, r.warranty)} />
                  <Row label="รอบเครื่อง" value={labelOf(BODY, r.body)} />
                  <Row label="หน้าจอ" value={labelOf(SCREEN, r.screen)} />
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="inline text-text-muted">ปัญหา: </dt>
                    <dd className="inline font-semibold text-text-heading">{problemsLabel(r.problems)}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setHandled(r, !r.handled)} disabled={busyId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-white px-3 py-1.5 text-xs font-bold text-text-heading transition-colors hover:border-yellow disabled:opacity-50">
                    {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : r.handled ? <RotateCcw size={13} /> : <Check size={13} />}
                    {r.handled ? "กลับเป็นรอติดต่อ" : "ติดต่อแล้ว"}
                  </button>
                  <button type="button" onClick={() => copyDetail(r)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-white px-3 py-1.5 text-xs font-bold text-text-heading transition-colors hover:border-yellow">
                    <Copy size={13} /> คัดลอกรายละเอียด
                  </button>
                  <button type="button" onClick={() => del(r)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-error-border bg-white px-3 py-1.5 text-xs font-bold text-error-text transition-colors hover:bg-error-bg">
                    <Trash2 size={13} /> ลบ
                  </button>
                </div>
              </div>
            ))}
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline text-text-muted">{label}: </dt>
      <dd className="inline font-semibold text-text-heading">{value}</dd>
    </div>
  );
}

/** ข้อความสรุปสำหรับคัดลอกไปคุยต่อ (รูปแบบเดียวกับที่ลูกค้าส่งเข้า LINE) */
function detailText(r: TradeInRequest): string {
  return [
    `คำขอประเมินไอโฟนแลกเงิน${r.refCode ? ` (${r.refCode})` : ""}`,
    `ประเภท: ${labelOf(DEVICE_TYPES, r.deviceType)}`,
    `รุ่น: ${r.model}`,
    `ความจุ: ${labelOf(STORAGES, r.storage)}`,
    r.color ? `สี: ${r.color}` : null,
    `เวอร์ชัน: ${labelOf(REGIONS, r.region)}`,
    `สุขภาพแบต: ${labelOf(BATTERY, r.battery)}`,
    `อุปกรณ์: ${labelOf(ACCESSORIES, r.accessories)}`,
    `ประกัน: ${labelOf(WARRANTY, r.warranty)}`,
    `รอบเครื่อง: ${labelOf(BODY, r.body)}`,
    `หน้าจอ: ${labelOf(SCREEN, r.screen)}`,
    `ปัญหา: ${problemsLabel(r.problems)}`,
    `ชื่อ: ${r.name}`,
    `เบอร์: ${r.tel}`,
    `รหัสไปรษณีย์: ${r.zipcode}`,
    r.estimatedPrice != null ? `ราคาที่เว็บโชว์: ${baht(r.estimatedPrice)}` : null,
  ].filter(Boolean).join("\n");
}

function formatThaiDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
