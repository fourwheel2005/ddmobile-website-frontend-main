"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Inbox, Trash2, Copy, Phone, ChevronLeft, ChevronRight, Images } from "lucide-react";
import ProtectedImageViewer from "@/components/ProtectedImageViewer";
import { PHOTO_SLOTS } from "@/lib/serviceRequest";
import { SERVICES, type ServiceCode } from "@/lib/services";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { baht } from "@/lib/money";
import { TableSkeleton } from "@/components/Skeletons";
import StatCard from "@/components/ui/StatCard";
import {
  DEVICE_TYPES, STORAGES, REGIONS, BATTERY, ACCESSORIES, WARRANTY, BODY, SCREEN,
  labelOf, problemsLabel, tradeInArea,
  TRADEIN_STATUS_META, TRADEIN_OUTCOMES, nextTradeInStatuses,
} from "@/lib/tradeIn";

interface TradeInRequest {
  id: number; refCode: string | null;
  deviceType: string; model: string; storage: string; color: string | null; region: string;
  battery: string; accessories: string; warranty: string; body: string; screen: string; problems: string[];
  name: string; tel: string; zipcode: string;
  subdistrict: string | null; district: string | null; province: string | null;   // null = คำขอเก่า (มีแค่ zip)
  estimatedPrice: number | null; userEmail: string | null;
  handled: boolean; createdAt: string;
  status: string; assignedTo: string | null; outcomeReason: string | null; version: number;   // S15 CRM
  serviceType: "SELL" | "BALLOON";                 // V43 — คำขอเก่าทั้งหมด = BALLOON
  photos: { id: number; slot: string }[];
}

type ServiceFilter = "" | "SELL" | "BALLOON";
const SERVICE_FILTERS: { value: ServiceFilter; label: string }[] = [
  { value: "", label: "ทุกบริการ" },
  { value: "SELL", label: SERVICES.SELL.label },
  { value: "BALLOON", label: SERVICES.BALLOON.navLabel },
];
const slotLabel = (slot: string) => PHOTO_SLOTS.find((m) => m.slot === slot)?.label ?? "รูปเพิ่มเติม";
const serviceLabel = (s: string) => SERVICES[(s in SERVICES ? s : "BALLOON") as ServiceCode].label;
interface PageResult {
  content: TradeInRequest[]; page: number; totalPages: number; totalElements: number;
  last: boolean; pendingCount: number;
}

const PAGE_SIZE = 20;

/**
 * คำขอ "ขายเครื่อง" (/sell) และ "ผ่อนบอลลูน (บริการแลกเงิน)" (/trade-in) — ประเมินเครื่องของลูกค้า + รูปที่แนบ
 * เก็บคู่ขนานกับแชท LINE — ถ้า deep link ไม่ prefill ข้อความ คิวนี้คือที่เดียวที่ยังตามลูกค้าต่อได้
 */
export default function TradeInRequests() {
  const [data, setData] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [service, setService] = useState<ServiceFilter>("");
  const [viewing, setViewing] = useState<TradeInRequest | null>(null);   // ดูรูปเครื่อง (โหลดเมื่อเปิดเท่านั้น)
  // memo — viewer ดึงรูปใหม่เมื่อ array เปลี่ยน identity (ห้ามสร้างใหม่ทุก render)
  const viewingImages = useMemo(
    () => (viewing ? viewing.photos.map((p) => ({ path: `/admin/trade-in/photos/${p.id}`, label: slotLabel(p.slot) })) : []),
    [viewing],
  );

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/trade-in/requests", { params: { page, size: PAGE_SIZE, pendingOnly, service: service || undefined } })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(getApiError(e, "โหลดคำขอไม่สำเร็จ")))
      .finally(() => setLoading(false));
  }, [page, pendingOnly, service]);
  useEffect(() => { load(); }, [load]);

  // สลับตัวกรอง → กลับหน้าแรกเสมอ (ไม่งั้นค้างหน้า 5 ของชุดเดิมแล้วเห็นตารางว่าง)
  const toggleFilter = () => { setPendingOnly((v) => !v); setPage(0); };

  // เปลี่ยนสถานะ lead ตาม lifecycle — outcome (WON/LOST/ARCHIVED) ถามเหตุผลก่อน · ส่ง version กัน race
  const transition = async (r: TradeInRequest, target: string) => {
    let reason: string | null = null;
    if (TRADEIN_OUTCOMES.includes(target)) {
      reason = window.prompt(`เหตุผลของสถานะ "${TRADEIN_STATUS_META[target]?.label ?? target}"`, r.outcomeReason ?? "");
      if (reason === null) return;               // กดยกเลิก
      if (!reason.trim()) { toast.error("กรุณาระบุเหตุผล"); return; }
    }
    setBusyId(r.id);
    try {
      await api.post(`/admin/trade-in/requests/${r.id}/transition`, { targetStatus: target, reason: reason?.trim() || null, expectedVersion: r.version });
      toast.success("อัปเดตสถานะแล้ว");
      load();
    } catch (e) { toast.error(getApiError(e, "อัปเดตสถานะไม่สำเร็จ")); load(); }
    finally { setBusyId(null); }
  };

  const archive = async (r: TradeInRequest) => {
    const reason = window.prompt(`พับเก็บคำขอของ "${r.name}"? ระบุเหตุผล`, "");
    if (reason === null) return;
    if (!reason.trim()) { toast.error("กรุณาระบุเหตุผล"); return; }
    setBusyId(r.id);
    try {
      await api.delete(`/admin/trade-in/requests/${r.id}`, { params: { reason: reason.trim(), expectedVersion: r.version } });
      toast.success("พับเก็บแล้ว");
      load();
    } catch (e) { toast.error(getApiError(e, "พับเก็บไม่สำเร็จ")); load(); }
    finally { setBusyId(null); }
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
          <h3 className="font-display text-lg font-bold text-text-heading">คิวคำขอ ขายเครื่อง / ผ่อนบอลลูน</h3>
          <div className="flex flex-wrap items-center gap-2">
          {SERVICE_FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => { setService(f.value); setPage(0); }}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${service === f.value ? "border-text-heading bg-text-heading text-white" : "border-border-default text-text-body hover:border-yellow"}`}>
              {f.label}
            </button>
          ))}
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
        </div>

        {loading ? <TableSkeleton /> : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            {pendingOnly ? "ไม่มีคำขอที่ค้างติดต่อ" : "ยังไม่มีคำขอประเมินเข้ามา"}
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className={`rounded-2xl border p-4 ${r.status === "NEW" ? "border-yellow/50 bg-white" : "border-border-default bg-bg-subtle"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-text-heading">
                      <span className={`badge-dd ${r.serviceType === "SELL" ? "badge-info" : "badge-warning"}`}>{serviceLabel(r.serviceType)}</span>
                      {r.model} {r.storage}
                      <span className={`badge-dd ${TRADEIN_STATUS_META[r.status]?.cls ?? "badge-warning"}`}>{TRADEIN_STATUS_META[r.status]?.label ?? r.status}</span>
                      {r.assignedTo && <span className="text-xs font-normal text-text-muted">· ดูแลโดย {r.assignedTo}</span>}
                      {r.refCode && <span className="font-mono text-xs font-normal text-text-muted">{r.refCode}</span>}
                    </p>
                    {r.outcomeReason && <p className="mt-0.5 text-xs text-text-muted">เหตุผล: {r.outcomeReason}</p>}
                    <p className="mt-1 text-sm text-text-body">
                      {r.name} · <a href={`tel:${r.tel.replace(/\D/g, "")}`} className="font-semibold text-yellow-text hover:underline">{r.tel}</a> · {areaOf(r)}
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

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* stepper — เลือกสถานะถัดไปตาม lifecycle (server ตรวจซ้ำ) */}
                  {nextTradeInStatuses(r.status).length > 0 && (
                    <select
                      aria-label="เปลี่ยนสถานะ" disabled={busyId === r.id} value=""
                      onChange={(e) => { const t = e.target.value; if (t) transition(r, t); }}
                      className="input-dd min-h-0 w-auto py-1.5 text-xs">
                      <option value="">{busyId === r.id ? "กำลังบันทึก…" : "เปลี่ยนสถานะ →"}</option>
                      {nextTradeInStatuses(r.status).map((s) => <option key={s} value={s}>{TRADEIN_STATUS_META[s]?.label ?? s}</option>)}
                    </select>
                  )}
                  {r.photos.length > 0 && (
                    <button type="button" onClick={() => setViewing(r)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-yellow bg-yellow/10 px-3 py-1.5 text-xs font-bold text-text-heading transition-colors hover:bg-yellow/20">
                      <Images size={13} /> ดูรูปเครื่อง ({r.photos.length})
                    </button>
                  )}
                  <button type="button" onClick={() => copyDetail(r)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-white px-3 py-1.5 text-xs font-bold text-text-heading transition-colors hover:border-yellow">
                    <Copy size={13} /> คัดลอกรายละเอียด
                  </button>
                  {r.status !== "ARCHIVED" && (
                    <button type="button" onClick={() => archive(r)} disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-error-border bg-white px-3 py-1.5 text-xs font-bold text-error-text transition-colors hover:bg-error-bg disabled:opacity-50">
                      <Trash2 size={13} /> พับเก็บ
                    </button>
                  )}
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
      {viewing && (
        <ProtectedImageViewer title={`รูปเครื่อง ${viewing.model} ${viewing.refCode ?? ""}`} images={viewingImages} onClose={() => setViewing(null)} />
      )}
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
    `คำขอ${serviceLabel(r.serviceType)}${r.refCode ? ` (${r.refCode})` : ""}`,
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
    `ที่อยู่: ${areaOf(r)}`,
    r.estimatedPrice != null ? `ราคาที่เว็บโชว์: ${baht(r.estimatedPrice)}` : null,
    r.photos.length > 0 ? `รูปเครื่อง: ${r.photos.length} รูป (ดูในหลังบ้าน)` : null,
  ].filter(Boolean).join("\n");
}

function areaOf(r: TradeInRequest): string {
  return tradeInArea({ subdistrict: r.subdistrict ?? "", district: r.district ?? "", province: r.province ?? "", zipcode: r.zipcode });
}

function formatThaiDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
